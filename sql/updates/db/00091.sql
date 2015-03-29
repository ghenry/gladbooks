-- post_salesinvoice() - post salesinvoice to journal
-- RETURN INT4, 0=success
CREATE OR REPLACE FUNCTION post_salesinvoice(si_id INT8)
RETURNS INT4 AS $$
DECLARE
        r_si            RECORD;
        r_tax           RECORD;
        r_item          RECORD;
        code            NUMERIC;
        d               NUMERIC;
        c               NUMERIC;
        cashbasis       BOOLEAN;
BEGIN
        -- fetch salesinvoice details
        SELECT si.salesinvoice, si.taxpoint, si.subtotal, si.total, si.ref
        INTO r_si
        FROM salesinvoice_current si
        WHERE si.salesinvoice=si_id;

        SELECT vatcashbasis INTO cashbasis FROM business WHERE id=current_business();

        -- create journal entry
        INSERT INTO journal (transactdate, description)
        VALUES (r_si.taxpoint, 'Sales Invoice ' || r_si.ref);

        IF (r_si.total > 0) THEN
                d = r_si.total;
                c = NULL;
        ELSE
                d = NULL;
                c = ABS(r_si.total);
        END IF;

        -- TODO: divisions and departments

        -- 1100 = Debtors Control Account
        RAISE INFO 'Account: % Debit: % Credit %', '1100', d, c;
        INSERT INTO ledger (account, debit, credit) VALUES ('1100', d, c);

        -- post tax details to ledger
        FOR r_tax IN
        SELECT sit.salesinvoice, sit.account, sit.total
        FROM salesinvoice_tax sit WHERE sit.salesinvoice=si_id
        LOOP
                IF (r_tax.total < 0) THEN
                        d = ABS(r_tax.total);
                        c = NULL;
                ELSE
                        d = NULL;
                        c = r_tax.total;
                END IF;
                -- If VAT, select account to post to
                IF (r_tax.account = '2202') THEN
                        IF (cashbasis) THEN
                                code = '2205'; -- cash basis, post to holding account
                        ELSE
                                code = '2200';
                        END IF;
                ELSE
                        code = r_tax.account;
                END IF;
                RAISE INFO 'Account: % Debit: % Credit %', code, d, c;
                INSERT INTO ledger (account, debit, credit)
                VALUES (code, d, c);
        END LOOP;

        -- post product details to ledger
        FOR r_item IN
        SELECT sii.salesinvoice, p.account, sii.linetotal
        FROM salesinvoiceitem_display sii
        RIGHT JOIN product_current p ON p.product = sii.product
        WHERE sii.salesinvoice=si_id
        LOOP
                IF (r_item.linetotal < 0) THEN
                        d = ABS(r_item.linetotal);
                        c = NULL;
                ELSE
                        d = NULL;
                        c = r_item.linetotal;
                END IF;
                RAISE INFO 'Account: % Debit: % Credit %',r_item.account,d,c;
                INSERT INTO ledger (account, debit, credit)
                VALUES (r_item.account, d, c);
        END LOOP;

        RETURN '0';
END;
$$ LANGUAGE 'plpgsql';

