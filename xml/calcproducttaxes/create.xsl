<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
<xsl:output method="text" disable-output-escaping="yes" />

        <xsl:variable name="authuser" select="request/authuser" />
        <xsl:variable name="clientip" select="request/clientip" />
        <xsl:variable name="instance" select="request/instance" />
        <xsl:variable name="business" select="request/business" />

	<xsl:include href="../cleanQuote.xsl"/>
	<xsl:include href="../setSearchPath.xsl"/>

        <xsl:template match="request">
                <xsl:call-template name="setSearchPath"/>
                <xsl:text>CREATE TEMP TABLE lineitem (</xsl:text>
                <xsl:text>product INT4, total NUMERIC</xsl:text>
                <xsl:text>);</xsl:text>
		<xsl:apply-templates select="data/line"/>
                <xsl:text>SELECT t.name AS tax, tr.rate, SUM(l.total) AS amount </xsl:text>
                <xsl:text>FROM lineitem l </xsl:text>
                <xsl:text>INNER JOIN product_tax pt ON l.product = pt.product </xsl:text>
                <xsl:text>INNER JOIN tax_current t ON t.tax = pt.tax </xsl:text>
                <xsl:text>INNER JOIN taxrate_current tr ON t.tax = tr.tax </xsl:text>
                <xsl:text>WHERE NOW() BETWEEN COALESCE(tr.valid_from, NOW()) AND COALESCE(tr.valid_to, NOW()) </xsl:text>
                <xsl:text>GROUP BY t.name, tr.rate</xsl:text>
                <xsl:text>;</xsl:text>
	</xsl:template>

        <xsl:template match="line">
                <xsl:text>INSERT INTO lineitem (product,total) VALUES('</xsl:text>
                <xsl:value-of select="@product"/>
                <xsl:text>','</xsl:text>
                <xsl:value-of select="@total"/>
                <xsl:text>');</xsl:text>
	</xsl:template>

</xsl:stylesheet>
