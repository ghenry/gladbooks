<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
<xsl:output method="text" disable-output-escaping="yes" />

	<xsl:variable name="authuser" select="request/authuser" />
	<xsl:variable name="clientip" select="request/clientip" />
	<xsl:variable name="instance" select="request/instance" />
	<xsl:variable name="business" select="request/business" />

	<xsl:include href="../setSearchPath.xsl"/>

        <xsl:template match="request">
		<!-- search_path will be used by created.xsl -->
		<xsl:call-template name="setSearchPath"/>
		<!-- NOOP - we do our work in created.xsl -->
		<xsl:text>SELECT NULL;</xsl:text>
        </xsl:template>

</xsl:stylesheet>
