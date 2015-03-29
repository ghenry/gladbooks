CREATE TABLE purchaseinvoiceitem (
        id              SERIAL PRIMARY KEY,
        updated         timestamp with time zone default now(),
        authuser        TEXT,
        clientip        TEXT
);

CREATE TABLE purchaseinvoiceitemdetail (
        id              SERIAL PRIMARY KEY,
        purchaseinvoiceitem        INT4 references purchaseinvoiceitem(id) NOT NULL
            DEFAULT currval(pg_get_serial_sequence('purchaseinvoiceitem','id')),
        purchaseinvoice    INT4 references purchaseinvoice(id) NOT NULL
            DEFAULT currval(pg_get_serial_sequence('purchaseinvoice','id')),
        product         INT4 references product(id) NOT NULL,
        linetext        TEXT,
        discount        NUMERIC,
        price           NUMERIC,
        qty             NUMERIC DEFAULT '1',
        is_deleted      boolean DEFAULT false,
        updated         timestamp with time zone default now(),
        authuser        TEXT,
        clientip        TEXT
);

CREATE OR REPLACE VIEW purchaseinvoiceitem_current AS
SELECT * FROM purchaseinvoiceitemdetail
WHERE id IN (
        SELECT MAX(id)
        FROM purchaseinvoiceitemdetail
        GROUP BY purchaseinvoiceitem
)
AND is_deleted = false;
