<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
<xsl:output method="text" disable-output-escaping="yes" />

        <xsl:variable name="authuser" select="request/authuser" />
        <xsl:variable name="clientip" select="request/clientip" />
        <xsl:variable name="instance" select="request/instance" />
        <xsl:variable name="business" select="request/business" />
        <xsl:variable name="id" select="request/id" />

	<xsl:include href="../cleanQuote.xsl"/>
	<xsl:include href="../setSearchPath.xsl"/>
	<xsl:include href="purchaseinvoice.xsl"/>

        <xsl:template match="request">
		<xsl:text>BEGIN;</xsl:text>
                <xsl:apply-templates select="data/purchaseinvoice"/>
		<xsl:text>COMMIT;</xsl:text>
		<xsl:text>SELECT pi.id, o.name AS organisation, ref, ponumber, description, taxpoint, due, subtotal, tax, total, pi.updated, pi.authuser, pi.clientip </xsl:text>
                <xsl:text>FROM purchaseinvoice_current pi </xsl:text>
                <xsl:text>INNER JOIN organisation_current o ON o.id = pi.organisation </xsl:text>
		<xsl:text>WHERE pi.id=</xsl:text>
                <xsl:choose>
                        <xsl:when test="$id">
                                <xsl:text>'</xsl:text>
                                <xsl:value-of select="$id"/>
                                <xsl:text>';</xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                                <xsl:text>currval(pg_get_serial_sequence('purchaseinvoice','id'));</xsl:text>
                        </xsl:otherwise>
                </xsl:choose>
        </xsl:template>

</xsl:stylesheet>
