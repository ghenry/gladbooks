CREATE OR REPLACE FUNCTION updatesalesinvoicetotals()
RETURNS trigger AS $$
DECLARE
BEGIN
        -- set subtotal for this invoice --
        /*
        SELECT SUM(price * qty) INTO NEW.subtotal
        FROM salesinvoiceitem_current
        WHERE salesinvoice = NEW.salesinvoice;
        */

        -- salesinvoice_tax - record taxes charged for future reference
        -- the rates and dates in the tax tables may change, and we want
        -- a permanent record of what taxes were applied to *this* invoice
        INSERT INTO salesinvoice_tax (
                salesinvoice,
                account,
                taxname,
                rate,
                nett,
                total
        )
        SELECT
                si.salesinvoice,
                t.account as account,
                t.name as taxname,
                tr.rate,
                SUM(sii.price * sii.qty) AS nett,
                roundhalfeven(SUM(sii.price * sii.qty) * tr.rate/100, 2) AS total
        FROM salesinvoice_current si
        LEFT JOIN salesinvoiceitem_current sii ON si.salesinvoice = sii.salesinvoice
        INNER JOIN (
                SELECT * FROM product_tax WHERE is_applicable='t'
                AND id IN (SELECT MAX(id) FROM product_tax GROUP BY product, tax)
        ) pt ON sii.product = pt.product
        INNER JOIN taxrate_current tr ON tr.tax = pt.tax
        INNER JOIN tax_current t ON t.tax = pt.tax
        WHERE
        (tr.valid_from <= si.taxpoint OR tr.valid_from IS NULL)
        AND (tr.valid_to >= si.taxpoint OR  tr.valid_to IS NULL)
        AND si.salesinvoice = NEW.salesinvoice
        GROUP BY si.salesinvoice,t.account,t.name,sii.price, sii.qty,tr.rate
        ORDER BY tr.rate DESC
        ;

        RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

