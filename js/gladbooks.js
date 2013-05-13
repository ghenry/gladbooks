/* 
 * gladbooks.js - main gladbooks javascript functions
 *
 * this file is part of GLADBOOKS
 *
 * Copyright (c) 2012, 2013 Brett Sheffield <brett@gladbooks.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program (see the file COPYING in the distribution).
 * If not, see <http://www.gnu.org/licenses/>.
 */

var g_authurl = '/auth/';
var g_resourcedefaultsurl = '/defaults/';
var g_username = '';
var g_password = '';
var g_instance = '';
var g_business = '1';
var g_loggedin = false;
var g_max_ledgers_per_journal=7;
var g_frmLedger;
var g_tabid = 0;
var g_xml_relationships = '';

var STATUS_INFO = 1;
var STATUS_WARN = 2;
var STATUS_CRIT = 4;

/******************************************************************************/
$(document).ready(function() {

	/* no password, display login dialog */
	if (g_password == '') { displayLoginBox(); }

	/* prepare tabbed workarea */
	deployTabs();

	/* prepare menu */
	prepMenu();

	/* reload when logo clicked */
	$("img#logo").click(function(event) {
		event.preventDefault();
		$(this).fadeTo("slow", 0, function(){location.reload(true);});
	});     

	/* set up login box */
	$("form.signin :input").bind("keydown", function(event) {
		// handle enter key presses in input boxes
		var keycode = (event.keyCode ? event.keyCode :
			(event.which ? event.which : event.charCode));
		if (keycode == 13) { // enter key pressed
			// submit form
			document.getElementById('btnLogin').click();
			event.preventDefault();
		}
	});

	/* logout menu */
	$('a.logout-window').click(function() {
		logout();
		displayLoginBox();
	});

	$('button.submit').click(function() {
		// grab those login details and save for later
		g_username = $('input:text[name=username]').val();
		g_password = $('input:password[name=password]').val();
		auth_check();
	});
	
	$(window).unload(function() {
		logout();
	});

});

/*******************************************************************************
 * auth_check()
 *
 * Request an auth required page to test login credentials.
 * If successful, we can consider this user logged in.
 * Else, chuck them back to the login page with an error
 * NB: we send Authorization: 'Silent' instead of 'Basic' to 
 * prevent the browser popping up an auth dialog.
 *
 ******************************************************************************/
function auth_check()
{
	$.ajax({
		url: g_authurl + g_username,
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(data) { loginok(data); },
		error: function(data) { loginfailed(); },
	});
}

/******************************************************************************/
/* Prepare authentication hash */
function auth_encode(username, password) {
	var tok = username + ':' + password;
	var hash = Base64.encode(tok);
	return hash;
}

/******************************************************************************/
/* prepare tabbed workarea */
function deployTabs() {
	$('.tabcloser').click(function(event) {
		event.preventDefault();
		closeTab($(this).attr('href'));
	});
}

/******************************************************************************/
/* add a new tab with content, optionally activating it */
function addTab(title, content, activate, collection, refresh) {
	var tabid = g_tabid++;
	var tabClasses = 'tabhead tablet' + tabid + ' business' + g_business;
	var tabContentClasses = 'tablet tablet' + tabid + ' business' + g_business;

	if (collection) {
		tabContentClasses += ' ' + collection;
	}
	if (refresh) {
		tabContentClasses += ' refresh';
	}

	/* add tab and closer */
	$('ul.tablist').append('<li id="tabli' + tabid
		+ '" class="' + tabClasses + '">'
		+ '<a href="' + tabid + '">' + title + '</a>'
		+ '<a id="tabcloser' + tabid + '" class="tabcloser" href="'
		+ tabid  + '">'
		+ 'X</a></li>');

	/* add content */
	$('div.tabcontent').append('<div id="tab' + tabid + '" '
		+ 'class="' + tabContentClasses + '">');
	$('div#tab' + tabid).append(content);

	/* add closer event */
    $('#tabcloser' + tabid).click(function(event) {
		event.preventDefault();
		closeTab(tabid);
	});

	/* set up tab navigation */
	$(".tablist li").click(function(event) {
		event.preventDefault();
		var selected_tab = $(this).find("a").attr("href");
		activateTab(selected_tab);
	});
	
	/* activate our new tab */
	if (activate) {
		activateTab(tabid);
	}

	/* fade in if we aren't already visible */
	$('div.tabs').fadeIn(300);

	return tabid; /* return new tab id */
}

/******************************************************************************/
function activeTabId() {
	return $('li.tabhead.active').find('a.tabcloser').attr('href');
}

/******************************************************************************/
function updateTab(tabid, content) {
	console.log('updating tab ' + tabid);
	var tab = $('#tab' + tabid);

	/* preserve status message */
	var statusmsg = tab.find('.statusmsg').detach();

	tab.empty();
	tab.append(content);
	if (statusmsg) {
		tab.find('.statusmsg').replaceWith(statusmsg);
	}
}

/*******************************************************************************
 * return jQuery object for specified tab, or active tab if no tab specified  */
function getTabById(tabid) {
	return (tabid) ? $('#tab' + tabid) : activeTab();
}

/******************************************************************************/
function activateTab(tabid) {
		console.log("activating tab " + tabid);
        /* remove "active" styling from all tabs for this business */
        $(".tabhead.business" + g_business).removeClass('active');
        $(".tablet.business" + g_business).removeClass('active');

        /* mark selected tab as active */
        $(".tablet" + tabid).addClass("active");

		/* set focus to control with class "focus" */
        $(".tablet" + tabid).find(".focus").focus();
}

/*******************************************************************************
 * activateNextTab(tabid)
 *
 * Activate the "next" tab.
 *
 * Which tab is next?  Users have come to expect that if they close 
 * the active tab, the next tab to the right will become active,
 * unless there isn't one, in which case we go left instead.
 * See Mozilla Firefox tabs for an example.
 *
 ******************************************************************************/
function activateNextTab(tabid) {
	var trytab = tabid + 1;

	console.log("Looking for a tab to activate...");
	/* Try right first */
	while (trytab < g_tabid) {
		console.log("Trying tab " + trytab);
		if ($('.tablet' + trytab).length != 0) {
			if ($('.tablet' + trytab).hasClass('business' + g_business)) {
				activateTab(trytab);
				return true;
			}
		}
		trytab++;
	}
	/* now go left */
	trytab = tabid - 1;
	while (trytab >= 0) {
		console.log("Trying tab " + trytab);
		if ($('.tablet' + trytab).length != 0) {
			if ($('.tablet' + trytab).hasClass('business' + g_business)) {
				activateTab(trytab);
				return true;
			}
		}
		trytab--;
	}
	return false; /* no tab to activate */
}

/******************************************************************************/
/* remove a tab */
function closeTab(tabid) {
	var tabcount = $('div#tabs').find('div').size();

	if (! tabid) {
		/* close the active tab by default */
		var tabid = activeTabId();
	}

	/* if tab is active, activate another */
	if ($('.tablet' + tabid).hasClass('active')) {
		console.log("tab (" + tabid  + ") was active");
		activateNextTab(tabid);
	}

	/* remove tab and content - call me in the morning if pain persists */
	$('.tablet' + tabid).remove();

	/* if we have tabs left, fade out */
	if (tabcount == 1) {
		$('div#tabs').fadeOut(300);
	}
}

/******************************************************************************/
/* Remove all tabs from working area */
function removeAllTabs() {
	$('ul.tablist').children().remove(); /* tab headers */
	$('div.tablet').fadeOut(300);		 /* content */
}

/******************************************************************************/
/* Add Authentication header with logged-in user's credentials */
function setAuthHeader(xhr) {
	var hash = auth_encode(g_username, g_password);
	xhr.setRequestHeader("Authorization", "Silent " + hash);
}

/******************************************************************************/
/* login successful, do successful things */
function loginok(xml) {
	g_instance = '';
	$(xml).find('instance').each(function() {
		g_loggedin = true;
		g_instance = $(this).text();
		console.log('Instance selected: ' + g_instance);
	});
	if (g_instance == '') {
		/* couldn't find instance for user - treat as failed login */
		loginfailed();
	}
	else {
		/* have instance, hide login dialog and get list of businesses */
		hideLoginBox();
		prepBusinessSelector();
	}
}

/******************************************************************************/
/* Login failed - inform user */
function loginfailed() {
	g_password = '';
	g_loggedin = false;
	alert("Login incorrect");
	setFocusLoginBox();
}

/******************************************************************************/
/* logout() - Clear password and mark user logged out.  */
function logout()
{
	/* remove user menus */
	dropMenu();

	/* clear business selector */
	select = $('select.businessselect');
	select.empty();
	select.append('<option>&lt;select business&gt;</option>');

	/* clear working area */
	removeAllTabs();

	/* clear password */
	g_password = '';
	g_loggedin = false;
	$('input:password[name=password]').val('');
}

/*******************************************************************************
 * displayLoginBox()
 *
 * Display login dialog.  
 *
 * Based on:
 *   http://www.alessioatzeni.com/blog/login-box-modal-dialog-window-with-css-and-jquery/
 */
function displayLoginBox() {
	var loginBox = "#login-box";

	// we have the username already - grab it so focus is set properly later
	g_username = $('input:text[name=username]').val();

	// Fade in the Popup, setting focus when done
	$(loginBox).fadeIn(300, function () { setFocusLoginBox(); });
	
	// Set the center alignment padding + border see css style
	var popMargTop = ($(loginBox).height() + 24) / 2; 
	var popMargLeft = ($(loginBox).width() + 24) / 2; 
	
	$(loginBox).css({ 
		'margin-top' : -popMargTop,
		'margin-left' : -popMargLeft
	});
	
	// Fade in background mask unless already visible
	$('#mask').fadeIn(300);

};

/******************************************************************************/
/* Set Focus in Login Dialog Appropriately */
function setFocusLoginBox() {
	// if username is blank, set focus there, otherwise set it to password
	if (g_username == '') {
		$("#username").focus();
	} else {
		$("#password").focus();
	}
};

/******************************************************************************/
/* Hide Login Dialog */
function hideLoginBox() {
	$('#mask , .login-popup').fadeOut(300 , function() {
		$('#mask').hide();  
	}); 
}

/******************************************************************************/
/* prepare static menus */
function prepMenu() {
	$('ul.nav').find('a').each(function() {
		console.log("Menu: " + $(this).text());
		$(this).click(clickMenu);
	});
}

/******************************************************************************/
/* Fetch user specific menus in xml format */
function getMenu() {
	$.ajax({
		url: g_authurl + g_username +  ".xml",
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(xml) { setMenu(xml); },
		error: function(xml) { setMenu(xml); },
	});
}

/******************************************************************************/
function dropMenu() {
	/* move Logout out of the way */
	$logout = $('a#logout').detach();

	/* delete the rest of the menu contents */
	$("div#menudiv").empty();

	/* put Logout back, but clear */
	$("div#menudiv").append($logout);
	$('a#logout').text('');
}

/******************************************************************************/
function setMenu(xml) {
	/* move Logout out of the way */
	$logout = $('a#logout').detach();

	/* load xml with user's menus */
	$(xml).find("login").find("menu").each(function() {
		var item = $(this).attr("item");
		var tip = $(this).attr("tooltip");
		var href = $(this).attr("href");
		var n = $('<a href="'+ href +'" title="'+ tip +'">'+ item +'</a>');
		$(n).on("click", { url: href }, clickMenu);
		$("div#menudiv").append(n);
	});

	/* finally, add back Logout menu item */
	$("div#menudiv").append($logout);
	$('a#logout').text('Logout (' + g_username  + ')' );
}

/******************************************************************************/
/* grab menu event and fetch content in the background */
function clickMenu(event) {
	event.preventDefault();

	console.log("Menu '" + $(this).text() + "' was clicked");

	if ($(this).attr("href") == '#journal') {
		setupJournalForm();
	} 
	else if ($(this).attr("href") == '#ledger') {
		showQuery('ledgers', 'General Ledger', true);
	} 
	else if ($(this).attr("href") == '#businessview') {
		showQuery('businesses', 'Businesses', true);
	}
	else if ($(this).attr("href") == '#business.create') {
		getForm('business', 'create', 'Add New Business');
	}
	else if ($(this).attr("href") == '#chartview') {
		showQuery('accounts', 'Chart of Accounts', true);
	}
	else if ($(this).attr("href") == '#chartadd') {
		getForm('account', 'create', 'Add New Account');
	}
	else if ($(this).attr("href") == '#contacts') {
		showQuery('contacts', 'Contacts', true);
	}
	else if ($(this).attr("href") == '#contact.create') {
		getForm('contact', 'create', 'Add New Contact');
	}
	else if ($(this).attr("href") == '#departments.create') {
		getForm('department', 'create', 'Add New Department');
	}
	else if ($(this).attr("href") == '#divisions.create') {
		getForm('division', 'create', 'Add New Division');
	}
	else if ($(this).attr("href") == '#departments.view') {
		showQuery('departments', 'Departments', true);
	}
	else if ($(this).attr("href") == '#divisions.view') {
		showQuery('divisions', 'Divisions', true);
	}
	else if ($(this).attr("href") == '#organisations') {
		showQuery('organisations', 'Organisations', true);
	}
	else if ($(this).attr("href") == '#organisation.create') {
		getForm('organisation', 'create', 'Add New Organisation');
	}
	else if ($(this).attr("href") == '#products') {
		showQuery('products', 'Products', true);
	}
	else if ($(this).attr("href") == '#product.create') {
		getForm('product', 'create', 'Add New Product');
	}
	else if ($(this).attr("href") == '#rpt_balancesheet') {
		showQuery('reports/balancesheet', 'Balance Sheet', false);
	}
	else if ($(this).attr("href") == '#rpt_profitandloss') {
		showQuery('reports/profitandloss', 'Profit and Loss', false);
	}
	else if ($(this).attr("href") == '#salesorders') {
		showQuery('salesorders', 'Sales Orders', true);
	}
	else if ($(this).attr("href") == '#salesorder.create') {
		getForm('salesorder', 'create', 'New Sales Order');
	}
	else if ($(this).attr("href") == '#help') {
		addTab("Help", "<h2>Help</h2>", true);
	}
	else if ($(this).attr("href") == '#') {
		// do nothing
		console.log('Doing nothing, successfully');
	}
	else {
		addTab("Not Implemented", "<h2>Feature Not Available Yet</h2>", true);
	}
}

/******************************************************************************/
/* Display query results as list */
function showQuery(collection, title, sort, tab) {
	showSpinner();
	$.ajax({
		url: collection_url(collection),
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(xml) {
			displayResultsGeneric(xml, collection, title, sort, tab);
		},
		error: function(xml) {
			displayResultsGeneric(xml, collection, title);
		}
	});
}

/******************************************************************************/
/* fetch html form from server to display */
function getForm(object, action, title, xml, tab) {
	showSpinner();
	return $.ajax({
		url: '/html/forms/' + object + '/' + action + '.html',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		dataType: "html",
		success: function(html) {
			displayForm(object, action, title, html, xml, tab);
		},
		error: function(html) {
			displayForm(object, action, title, html, null, tab);
		}
	});
}

/******************************************************************************/
/* return active tab as jquery object */
function activeTab() {
	return $('div.tablet.active.business' + g_business);
}

/******************************************************************************/
/* pre-populate form with xml data                                            */
function populateForm(tab, object, xml) {
	var locString = '';
	var id = '';
	var mytab = getTabById(tab);

	if (xml) {
		/* we have some data, pre-populate form */
		$(xml).find('resources').find('row').children().each(function() {
			if (this.tagName == 'id') {
				id = $(this).text();
			}
			mytab.find('form.' + object).find(
				"[name='" + this.tagName + "']"
			).val($(this).text());

			if ((this.tagName == 'town') || (this.tagName == 'postcode')) {
				/* grab whatever location data we can, giving preference to 
				 * postcode */
				if ($(this).text().length > 0) {
					locString = $(this).text();
				}
			}

		});

		/* load map */
		if (locString.length > 0) {
			console.log('locString:' + locString);
			loadMap(locString, tab);
		}
	}

	return id;
}

/******************************************************************************/
/* deal with subforms */
function handleSubforms(tab, html, id) {
	$(html).find('form.subform').each(function() {
		var view = $(this).attr("action");
		var parentdiv = $(this).parent();
		var mytab = getTabById(tab);
		var datatable = mytab.find('div.' + view).find('table.datatable');
		var btnAdd = datatable.find('button.addrow:not(.btnAdd)');
		btnAdd.click(function(){
			if (view == 'salesorderitems') {
				salesorderAddProduct(datatable, tab);
			}
			else {
				addSubformEvent($(this), view, id, tab);
			}
		});
		btnAdd.addClass('btnAdd');
		loadSubformData(view, id, tab);
	});
}

/******************************************************************************/
/* display html form we've just fetched in new tab */
function displayForm(object, action, title, html, xml, tab) {
	console.log('displayForm("'+ object +'","'+ action +'","'+ title +'")');
	var id = 0;

	if ((object == 'salesorder') && (action == 'update') && (xml)) {
		/* Display Sales Order number as tab title */
		title = 'SO ' + $(xml).find('order').first().text();
	}

	if (tab) {
		tab = updateTab(tab, html);
	}
	else {
		tab = addTab(title, html, false);
	}

	var mytab = getTabById(tab);

	/* if we have some data, pre-populate form */
	id = populateForm(tab, object, xml);

	handleSubforms(tab, html, id);   /* deal with subforms */

	/* when all combos are populated, finalise form display */
	$.when(populateCombos(tab))
	.done(function() {
		finaliseForm(tab, object, action, id);
	});
}

/******************************************************************************/
function finaliseForm(tab, object, action, id) {
	formatDatePickers();        			  /* date pickers */
	formatRadioButtons(tab, object);  		  /* tune the radio */
	formBlurEvents(tab);					  /* set up blur() events */
	formEvents(tab, object, action, id);      /* submit and click events etc. */
	activateTab(tab);			              /* activate the tab */
	hideSpinner();                            /* wake user */
}

/******************************************************************************/
function formEvents(tab, object, action, id) {
	var mytab = getTabById(tab);

	/* save button click handler */
	mytab.find('button.save').click(function() 
	{
		doFormSubmit(object, action, id);
	});

	/* Cancel button closes tab */
	mytab.find('button.cancel').click(function()
	{
		closeTab();
	});

	/* Reset button resets form */
	mytab.find('button.reset').click(function(event)
	{
		event.preventDefault();
		mytab.find('form:not(.subform)').get(0).reset();
	});

	/* deal with submit event */
	mytab.find('form:not(.subform)').submit(function(event)
	{
		event.preventDefault();
		doFormSubmit(object, action, id);
	});
}

/******************************************************************************/
function formBlurEvents(tab) {
	var mytab = getTabById(tab);
    mytab.find('input.price').each(function() {
        $(this).blur(function() {
            /* pad amounts to two decimal places */
			if ($(this).val().length > 0) {
	            var newamount = decimalPad($(this).val(), 2);
        		$(this).val(newamount);
			}
        });
    });
	mytab.find('input.price, input.qty').each(function() {
        $(this).blur(function() {
			recalculateLineTotal($(this).parent().parent(), tab);
		});
	});
}

/******************************************************************************/
function formatRadioButtons(tab, object) {
	var mytab = getTabById(tab);
	/* tune the radio */
	mytab.find('div.radio.untuned').find('input[type="radio"]').each(function()
	{
		var oldid = $(this).attr('id'); /* note old id */
		$(this).attr('id', '');			/* remove old id */
		$(this).uniqueId(); 			/* add new, unique id */
		/* use old id to locate linked label, and update its "for" attr */
		$(this).parent().find('label[for="' + oldid + '"]').attr('for', 
			$(this).attr('id'));
	});
	mytab.find('div.radio.untuned').buttonset();
	mytab.find('div.radio.untuned').change(function() {
		changeRadio($(this), object);
	});
	mytab.find('div.radio.untuned').removeClass('untuned');
}

/******************************************************************************/
function formatDatePickers() {
	$('div.active').find('.datefield').datepicker({
	   	dateFormat: "yy-mm-dd",
		constrainInput: true
	});
}

/******************************************************************************/
function contactSearch(searchString) {
	console.log('searching for contacts like "' + searchString + '"');
	searchQuery('contacts', searchString);
}

/******************************************************************************/
function searchQuery(view, query) {
    console.log('Loading subform with data ' + view);
    url = collection_url('search/' + view);
    if (query) {
        url += query + '/'
    }
    $.ajax({
        url: url,
        beforeSend: function (xhr) { setAuthHeader(xhr); },
        success: function(xml) {
            displaySearchResults(view, query, xml);
        },
        error: function(xml) {
            console.log('Error searching.');
        }
    });
}

/******************************************************************************/
/* TODO */
function displaySearchResults(view, query, xml) {
	console.log("Search results are in.");
	var results = new Array();
	$(xml).find('row').each(function() {
		var id = $(this).find('id').text();
		var name = $(this).find('name').text();
		results.push(name);
	});
	activeTab().find('input.contactsearch').autocomplete(
		{ source: results }
	);
}

/******************************************************************************/
/* a radio button value has changed */
function changeRadio(radio, object) {
	var station = radio.find('input[type="radio"]:checked').val();
	console.log('Radio tuned to ' + station);
	if (object == 'organisation') {
		if (station == '0') {
			$('tr.contact.link').hide();
			$('tr.contact.create').show();
		}
		else if (station == '1') {
			$('tr.contact.create').hide();
			$('tr.contact.link').show();
		}
	}
}

/******************************************************************************/
/* recalculate line total */
function recalculateLineTotal(parentrow, tab) {
	var p = parentrow.find('input.price').val();
	var q = parentrow.find('input.qty').val();

	/* if price is blank, use placeholder value */
	if (!p) {
		p = parentrow.find('input.price').attr('placeholder');
	}

	p = new Big(p);
	q = new Big(q);
	var t = p.times(q);
	t = decimalPad(roundHalfEven(t, 2), 2);
	var inputtotal = parentrow.find('input.total');
	var oldval = inputtotal.val();
	inputtotal.val(t);
	if (oldval != t) {
		updateSalesOrderTotals(tab);
	}
}

/******************************************************************************/
function doFormSubmit(object, action, id) {
	console.log('doFormSubmit(' + object + ',' + action + ',' + id + ')');
	if (validateForm(object, action, id)) {
		if (id > 0) {
			submitForm(object, action, id);
		}
		else {
			submitForm(object, action);
		}
	}
}

/******************************************************************************/
function validateForm(object, action, id) {
	console.log('validating form ' + object + '.' + action);
	statusHide(); /* remove any prior status */

	if (object == 'account') {
		return validateFormAccount(action, id);
	}
	if (object == 'product') {
		return validateFormProduct(action, id);
	}
	else if (object == 'salesorder') {
		return validateFormSalesOrder(action, id);
	}
	return true;
}

/******************************************************************************/
function validateFormAccount(action, id) {
	var mytab = activeTab();

	var type = mytab.find('select.type');
	if (type.val() < 0) {
		statusMessage('Please select an Account Type', STATUS_WARN);
		type.focus();
		return false;
	}

	var description = mytab.find('input.description');
	if (description.val().length < 1) {
		statusMessage('Please enter a Description', STATUS_WARN);
		description.focus();
		return false;
	}

	return true;
}

/******************************************************************************/
function validateFormProduct(action, id) {
	var mytab = activeTab();

	var account = mytab.find('select.account');
	if (account.val() < 0) {
		statusMessage('Please select an Account', STATUS_WARN);
		account.focus();
		return false;
	}
	var shortname = mytab.find('input.shortname');
	if (shortname.val().length < 1) {
		statusMessage('Please enter a Short Name ', STATUS_WARN);
		shortname.focus();
		return false;
	}
	var description = mytab.find('input.description');
	if (description.val().length < 1) {
		statusMessage('Please enter a Description', STATUS_WARN);
		description.focus();
		return false;
	}

	return true;
}

/******************************************************************************/
function validateFormSalesOrder(action, id) {
	var mytab = activeTab();

	var customer = mytab.find('select.organisations');
	if (customer.val() < 0) {
		statusMessage('Please select a Customer', STATUS_WARN);
		customer.focus();
		return false;
	}
	var products = mytab.find('td.xml-product');
	if (products.length < 1) {
		statusMessage('Please add a Product to the Sales Order', STATUS_WARN);
		return false;
	}

	return true;
}

/******************************************************************************/
function statusHide() {
	var statusmsg = activeTab().find('div.statusmsg');
	statusmsg.hide();
}

/******************************************************************************/
function statusMessage(message, severity, fade) {
	var statusmsg = activeTab().find('div.statusmsg');

	if (statusmsg.length == 0) {
		/* no status box, create one */
		console.log("No div.statusmsg - creating one");
		activeTab().find('div').first().prepend('<div class="statusmsg clearfix"/>');
		var statusmsg = activeTab().find('div.statusmsg');
	}

	statusmsg.removeClass('info warn crit');

	if (severity == STATUS_INFO) {
		statusmsg.addClass('info');
	}
	else if (severity == STATUS_WARN) {
		statusmsg.addClass('warn');
	}
	else if (severity == STATUS_CRIT) {
		statusmsg.addClass('crit');
	}
	
	statusmsg.text(message);
	statusmsg.show();

	if (fade) {
		statusmsg.fadeOut(fade);
	}
}

/******************************************************************************/
function updateSalesOrderTotals(tab) {
	/* FIXME: uncaught exception: NaN */
	console.log('Updating salesorder totals');

	var subtotal = Big('0.00');
	var taxes = Big('0.00');
	var gtotal = Big('0.00');
	var mytab = getTabById(tab);

	mytab.find('input.total:not(.clone)').each(function() 
	{
		subtotal = subtotal.plus(Big($(this).val()));
	});

	gtotal = subtotal.plus(taxes);

	/* update sub total */
	subtotal = decimalPad(subtotal, 2);
	mytab.find('table.totals').find('td.subtotal').each(function() 
	{
		$(this).text(subtotal);
	});

	/* update grand total */
	gtotal = decimalPad(gtotal, 2);
	mytab.find('table.totals').find('td.gtotal').each(function() 
	{
		$(this).text(gtotal);
	});

}

/******************************************************************************/
function productBoxClone(mytab, product) {
	var productBox = $('<td class="xml-product"></td>');
	var productCombo = mytab.find('select.product.nosubmit').clone(true);
	productCombo.removeAttr("id");
	productCombo.css({display: "inline-block"});
	productCombo.removeClass('chzn-done nosubmit');
	productCombo.addClass('chosify sub');
	productCombo.val(product);
	productCombo.find('option[value=-1]').remove();
	productCombo.appendTo(productBox);
	return productBox;
}

/******************************************************************************/
function cloneInput(mytab, input) {
	console.log('Cloning input ' + input);
	if (input == 'total') {
		var iClass = 'clone';
	}
	else {
		var iClass = 'nosubmit';
	}
	var iSelector = 'input.' + iClass + '.' + input;
	var iBox = mytab.find(iSelector);
	var td = iBox.parent().clone(true);
	td.addClass('xml-' + input);
	td.find(iSelector).each(function() {
		$(this).removeClass(iClass);
		if (input == 'qty') {
			$(this).addClass('endsub');
		}
	});
	return td;
}

/******************************************************************************/
function salesorderAddProduct(datatable, tab) {
	var mytab = getTabById(tab);
	var product = mytab.find('select.product.nosubmit').val();
	var linetext = mytab.find('input[name$="linetext"]').val();
	var price = mytab.find('input[name$="price"]').val();
	var row = $('<tr class="even"></tr>');
	console.log('Adding product ' + product + ' to salesorder');

	statusHide();

	if (product == -1) {
		statusMessage('Please select a Product', STATUS_WARN);
		return; /* must select a product */
	}

	/* We're not saving anything yet - just building up a salesorder on the
	 * screen until the user clicks "save" */

	/* copy the product combo and prepare for chosen() */
	row.append(productBoxClone(mytab, product));

	/* append linetext input */
	row.append(cloneInput(mytab, 'linetext'));

	/* clone price input and events */
	row.append(cloneInput(mytab, 'price'));

	/* clone qty input and events */
	row.append(cloneInput(mytab, 'qty'));

	/* clone total input and events */
	row.append(cloneInput(mytab, 'total'));

	row.append('<td class="removerow"><button class="removerow">X</button></td>');

	/* add handler to remove row */
	row.find('button.removerow').click(function () {
		$(this).parent().parent().fadeOut(300, function() {
			$(this).remove();
			updateSalesOrderTotals(tab);
		});
	});

	datatable.append(row);

	/* prettify the chosen() combos */
	datatable.find('select.chosify').each(function() {
		$(this).chosen();
		$(this).removeClass('chosify');
	});

	updateSalesOrderTotals(tab);
}

/******************************************************************************/
function populateCombos(tab) {
	console.log('populateCombos()');
	var combosity = new Array();
	var mytab = getTabById(tab);

	mytab.find('select.populate:not(.sub)').each(function() {
		var combo = $(this);
		$(this).parent().find('a.datasource').each(function() {
			datasource = $(this).attr('href');
			console.log('datasource: ' + datasource );
			if ((datasource == 'relationships') && (g_xml_relationships)) {
				/* here's one we prepared earlier */
				console.log('using cached relationship data');
				populateCombo(g_xml_relationships, combo);
			}
			else {
				combosity.push(loadCombo(datasource, combo));
			}
		});
	});

	console.log('combosity level is ' + combosity.length);
	return $.when(combosity);
}

/******************************************************************************/
function loadCombo(datasource, combo) {
	console.log('loadCombo()');
	url = collection_url(datasource);
	console.log('populating a combo from datasource: ' + url);

	return $.ajax({
		url: url,
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(xml) {
			if (datasource == 'relationships') {
				console.log('caching relationship data');
				g_xml_relationships = xml;
			}
			populateCombo(xml, combo);
		},
		error: function(xml) {
			console.log('Error loading combo data');
		}
	});
}

/******************************************************************************/
function populateCombo(xml, combo, tab) {
	console.log('populateCombo()');
	console.log('Combo data loaded for ' + combo.attr('name'));
	var selections = [];
	var mytab = getTabById(tab);

	/* first, preserve selections */
	for (var x=0; x < combo[0].options.length; x++) {
		selections[combo[0].options[x].text] = combo[0].options[x].selected;
	}

	combo.empty();

	/* add placeholder */
	if ((combo.attr('data-placeholder')) && (combo.attr('multiple') != true)) {
		console.log('combo has placeholder');
		var placeholder = combo.attr('data-placeholder');
		combo.append($("<option />").val(-1).text(placeholder));
	}

	/* now, repopulate and reselect options */
	$(xml).find('row').each(function() {
   		var id = $(this).find('id').text();
		if (combo.attr('name') == 'cycle') {
			var name = $(this).find('cyclename').text();
		}
		else if (combo.attr('name') == 'account') {
   			var id = $(this).find('nominalcode').text();
			id = padString(id, 4);  /* pad nominal code to 4 digits */
			var name = id + " - " + $(this).find('account').text();
		}
		else if (combo.attr('name') == 'product') {
			var name = $(this).find('shortname').text();
		}
		else {
			var name = $(this).find('name').text();
		}
		combo.append($("<option />").val(id).text(name));
		if (selections[id]) {
			combo[0].options[id].selected = selections[id];
		}
	});

	combo.chosen();

	if (combo.attr('name') == 'type') {
		/* add change() event to nominal code input box */
		mytab.find('input.nominalcode').change(function() {
			return validateNominalCode($(this).val(), combo.val(), xml);
		});
	}
	else if (combo.attr('name') == 'account') {
		console.log('setting value of product->account combo');
		mytab.find('input.nosubmit[name="account"]').each(function() {
			combo.find(
				'option[value=' + $(this).val() + ']'
			).attr('selected', 'selected');
		});
	}
	else {
		combo.change(function() {
			comboChange($(this), xml, tab);
		});
	}

	combo.trigger("liszt:updated");
}

/******************************************************************************/
/* return true iff nominal code is in range for type */
function validateNominalCode(code, type, xml) {

	if (type < 0) { /* type not selected yet */
		console.log('type not selected');
		return true;
	}
	
	/* find row that refers to this type */
	var row = $(xml).find('id').filter(function() {
		return $(this).parent().find('id').text() == type;
	}).parent();

	var min = row.find('range_min').text();
	var max = row.find('range_max').text();
	var typename = row.find('name').text();
	var ret = false;

	statusHide();

	console.log('code: ' + code);
	console.log('min: ' + min);
	console.log('max: ' + max);
	console.log('typename: ' + typename);

	if (code.length == 0) { /* blank is okay */
		console.log('nominal code is blank');
		return true;
	}
	else if (isNaN(code)) { /* must be a number */
		console.log('nominal code not a number');
		statusMessage('Nominal Code must be a number', STATUS_WARN);
		return false;
	}
	else if ((code < min) || (code > max)) { /* must be in defined range */
		console.log('nominal code out of range');
		statusMessage('Nominal Codes for ' + typename 
			+ ' must lie between ' + min + ' and ' + max, STATUS_WARN);
		return false;
	}
	else { /* ensure code hasn't been used */
		/* TODO */
	}
	console.log('Nominal code is within acceptable range');

	return true;
}

/******************************************************************************/
/* handle actions required when combo value changes */
function comboChange(combo, xml, tab) {
	var id = combo.attr('id');
	var newval = combo.val();

	console.log('Value of ' + id + ' combo has changed to ' + newval);

	/* deal with chart form type combo */
	if (combo.attr('name') == 'type') {
		var code = activeTab().find('input.nominalcode').val();
		return validateNominalCode(code, newval, xml);
	}

	/* in the salesorder form, dynamically set placeholders to show defaults */
	if (getTabById(tab).find('div.salesorder')) {
		if (newval == '-1') {
			alert('I want a cup of tea');
		}
		$(xml).find('row').find('id').each(function() {
			if ($(this).text() == newval) {
				var desc = $(this).parent().find('description').text();
				var price = $(this).parent().find('price_sell').text();
				price = decimalPad(price, 2);
				var parentrow = combo.parent().parent();
				parentrow.find('input.linetext').attr('placeholder', desc);
				parentrow.find('input.price').attr('placeholder', price);
				recalculateLineTotal(parentrow, tab);
			}
		});
	}
}

/******************************************************************************/
/* link contact to organisation */
function relationshipUpdate(organisation, contact, relationships, refresh) {
	console.log('Updating relationship');

	/* ensure we were called with required arguments */
	if (!organisation) {
		console.log('relationshipUpdate() called without organisation.  Aborting.');
		return false;
	}
	if (!contact) {
		console.log('relationshipUpdate() called without contact.  Aborting.');
		return false;
	}

	var xml = createRequestXml();

    xml += '<organisation id="' + organisation + '"/>';
    xml += '<contact id="' + contact + '"/>';
	xml += '<relationship id="0"/>'; /* base "contact" relationship */

	/* any other relationship types we've been given */
	if (relationships) {
		for (var x=0; x < relationships.length; x++) {
			xml += '<relationship id="' + relationships[x] + '"/>';
		}
	}

	xml += '</data></request>';

	console.log(xml);

	var url = collection_url('organisation_contacts') + organisation
	url += '/' + contact + '/';

	console.log('POST ' + url);
	$.ajax({
		url: url,
		data: xml,
		contentType: 'text/xml',
		type: 'POST',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		complete: function(xml) {
			console.log('relationship updated');
			if (refresh) {
				loadSubformData('organisation_contacts', organisation);
			}
		},
	});
}

/******************************************************************************/
/* apply tax to product */
function taxProduct(product, tax, refresh, tab) {
	console.log('Taxing product');
	var xml = createRequestXml();

    xml += '<product>' + product + '</product>';
    xml += '<tax>' + tax + '</tax>';
	xml += '</data></request>';

	var url = collection_url('product_taxes');

	console.log('POST ' + url);
	$.ajax({
		url: url,
		data: xml,
		contentType: 'text/xml',
		type: 'POST',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		complete: function(xml) {
			if (refresh) {
				loadSubformData('product_taxes', product, tab);
			}
		},
	});
}

/******************************************************************************/
/* Fetch data for a subform */
function loadSubformData(view, id, tab) {
	console.log('loadSubformData()');
	console.log('Loading subform with data ' + view);
	url = collection_url(view);
	if (id) {
		url += id + '/';
	}
	$.ajax({
		url: url,
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(xml) {
			console.log("Loaded subform data.  Hoorah.");
			displaySubformData(view, id, xml, tab);
		},
		error: function(xml) {
			console.log('Error loading subform data');
			displaySubformData(view, id, xml, tab); /* needed for events */
		}
	});
}

/******************************************************************************/
function addSubformEvent(object, view, parentid, tab) {
	/* attach click event to add rows to subform */
	console.log('addSubformEvent()');
	console.log('Adding row to subform parent ' + parentid);

	console.log('object:' + object);
	console.log('view:' + view);
	console.log('parentid:' + parentid);

	/* the part before the underscore is the parent collection */
	var parent_collection = view.split('_')[0];
	var subform_collection = view.split('_')[1];

	var url = collection_url(subform_collection);
	var xml = createRequestXml();

	/* open xml element for the subform object */
	xml += '<' + subform_collection.slice(0,-1) + '>';

	/* find inputs */
	var row = object.parent().parent();
	row.find('input').each(function() {
		var input_name = $(this).attr('name');
		if (input_name) {
			if (input_name == subform_collection) {
				xml += '<' + input_name + ' id="';
				xml += escapeHTML($(this).val());
				xml += '"/>';
			}
			else {
				xml += '<' + input_name + '>';
				xml += escapeHTML($(this).val());
				xml += '</' + input_name + '>';
			}
		}
	});

	/* deal with select(s) */
	row.find('select').each(function() {
		console.log('deal with select(s)');
		var input_name = $(this).attr('name');
		if (input_name == 'relationship') {
			xml += '<relationship organisation="'
			xml += parentid + '" type="0" />';
		}
		if (input_name) {
			console.log('I have <select> with name: ' + input_name);

			$(this).find('option:selected').each(function() {
				xml += '<' + input_name;
				xml += ' ' + parent_collection + '="' + parentid + '"';
				xml += ' type="' + escapeHTML($(this).val())
				xml += '"/>';
			});
		}
	});

	/* close subform object element */
	xml += '</' + subform_collection.slice(0,-1) + '>';

	xml += '</data></request>';

	$.ajax({
		url: url,
		type: 'POST',
		data: xml,
		contentType: 'text/xml',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(xml) {
			console.log('SUCCESS: added row to subform');
			loadSubformData(view, parentid, tab);
		},
		error: function(xml) {
			console.log('ERROR adding row to subform');
		},
	});
}

/******************************************************************************/
/* return a tr with odd or even class as appropriate */
function newRow(i) {
	if (i % 2 == 0) {
		return row = $('<tr class="even">');
	} else {
		return row = $('<tr class="odd">');
	}
}

/******************************************************************************/
function markComboSelections(combo, typedata) {
	if (typedata) {
		var types = typedata.split(',');
		if (types.length > 0) {
			for (var j=0; j < types.length; j++) {
				var opt = 'option[value=' + types[j] +']';
				combo.find(opt).attr('selected', true);
			}
		}
	}
}

/******************************************************************************/
function relationshipCombo(datatable, tag, id, tab) {
	console.log('appending relationship combo');

	if (!g_xml_relationships) {
		/* FIXME - we're supposed to have relationship data here,
		 * and we don't */
		console.log('Not in a relationship');
	}
	var combo = datatable.find('select.relationship.nosubmit').clone();

	combo.removeAttr("id");
	combo.css({display: "inline-block"});
	combo.removeClass('chzn-done nosubmit');
	combo.addClass('chosify sub');

	/* mark our selections */
	markComboSelections(combo, tag.text());

	var td = $('<td class="noclick">'
		+ '<input type="hidden" name="id" value="' + id + '"/>');

	combo.change(function() {
		console.log('combo.change()');
		if (combo.hasClass('relationship')) {
			var trow = combo.parent();
			var contact = trow.find('input[name="id"]').val();
			var relationships = new Array();
			for (var x=0; x < combo[0].options.length; x++) {
				if (combo[0].options[x].selected) {
					relationships.push(x);
				}
			}
			relationshipUpdate(parentid, contact, relationships);
		}
		comboChange(tag, xml, tab);
	});
	td.append(combo);
	return td;
}

/******************************************************************************/
function prepareSalesOrderData(tag) {
	/* FIXME: this simply doesn't work */
	console.log('salesorderitem: ' + tag.tagName);
	if (tag.tagName == 'product') {
		var p = activeTab().find(
			'select.nosubmit[name="' + tag.tagName + '"]'
		);
		p.find(
			'option[value="' + $(tag).text()  + '"]'
		).attr('selected', 'selected');
		p.trigger("change");
	}
	else {
		activeTab().find(
			'input.nosubmit[name="' + tag.tagName + '"]'
		).val($(tag).text());
	}
}

/******************************************************************************/
function addSalesOrderProductField(field, value) {
	if (value.length > 0) {
		activeTab().find('input.nosubmit[name="' + field + '"]').val(value);
	}
}

/******************************************************************************/
function addSalesOrderProducts(xml, datatable, tab) {
	$(xml).find('resources').find('row').each(function() {
		var mytab = getTabById(tab);
		var id = $(this).find('id').text();
		var salesorder = $(this).find('salesorder').text();
		var product = $(this).find('product').text();
		var linetext = $(this).find('linetext').text();
		var discount = $(this).find('discount').text();
		var price = $(this).find('price').text();
		var qty = $(this).find('qty').text();

		/* select product */
		var p = activeTab().find('select.nosubmit[name="product"]');
		p.find('option[value="' + product + '"]').attr('selected', 'selected');
		p.trigger("change");

		addSalesOrderProductField('linetext', linetext);
		addSalesOrderProductField('price', price);
		addSalesOrderProductField('qty', qty);

		/* trigger line total calculation */
		mytab.find('input.qty').trigger('blur');

		salesorderAddProduct(datatable, tab)
	});
}

/*******************************************************************************
 * addSubFormRows()
 *
 * add row to datatable for each subform item - not used for salesorders
 *
 ******************************************************************************/
function addSubFormRows(xml, datatable, view, tab) {
	var i = 0;
	var id = 0;
	$(xml).find('resources').find('row').each(function() {
		var row = newRow(i);

		$(this).children().each(function() {
			if (this.tagName == 'id') {
				id = $(this).text();
			}
			else if (this.tagName == 'type') {
				row.append(relationshipCombo(datatable, $(this), id, tab));
			}
			else {
				row.append('<td>' + $(this).text() + '</td>');
			}
		});

		/* append remove "X" button */
		row.append('<td class="removerow noclick">' 
			+ '<input type="hidden" name="id" value="' 
			+ id + '"/><button class="removerow">X</button></td>');

		/* attach click event to edit elements of subform */
		row.find('td').not('.noclick').click(function() {
			var id = $(this).parent().find('input[name="id"]').val();
			var collection = view.split('_')[1].toLowerCase();
			displayElement(collection, id);
		});

		datatable.append(row);

		i++;
	});
}

/******************************************************************************/
function clearForm(datatable) {
	datatable.find('input[type=text]').each(function() {
		$(this).val('');
	});
	datatable.find('input[name=qty]').each(function() {
		$(this).val('1');
	});
	datatable.find('input[type=email]').each(function() {
		$(this).val('');
	});
	datatable.find('select.chzn-done:not(.sub)').val('');
	datatable.find('select.chzn-done:not(.sub)').trigger("liszt:updated");
}

/******************************************************************************/
/* We've loaded data for a subform; display it */
function displaySubformData(view, parentid, xml, tab) {
	console.log('displaySubformData()');
	console.log("Displaying subform " + view + " data");
	console.log('displaySubformData() is operating on tab ' + tab);
	var mytab = getTabById(tab);
	var datatable = mytab.find('div.' + view).find('table.datatable');
	var types = [];
	datatable.find('tbody').empty();

	if (view == 'salesorderitems') {
		addSalesOrderProducts(xml, datatable, tab);
	}
	else {
		addSubFormRows(xml, datatable, view, tab);
	}

	datatable.find('select.chosify').chosen(); /* format combos */
	datatable.find('tbody').fadeIn(300);       /* display table body */
	clearForm(datatable);                      /* clear form */

	/* attach click event to remove rows from subform */
	datatable.find('button.removerow').click(function() {
		btnClickRemoveRow(view, parentid);
	});

    /* "Link Contact" button event handler for organisation form */
    mytab.find('button.linkcontact').click(function() {
		btnClickLinkContact(parentid, tab);
	});

    /* "Apply Tax" button event handler for product form */
    mytab.find('button.taxproduct').click(function() {
		var c = $(this).parent().parent().find('select.tax').val();
		taxProduct(parentid, c, true, tab);
    });
}

/******************************************************************************/
function btnClickLinkContact(parentid, tab) {
	var mytab = getTabById(tab);
	var c = mytab.find('select.contactlink').val();
	relationshipUpdate(parentid, c, false, true);
}

/******************************************************************************/
function btnClickRemoveRow(view, parentid) {
	var trow = $(this).parent();
	var id = trow.find('input[name="id"]').val();
	console.log('Delete sub id + ' + id + ' from parent ' + parentid);
	var url = collection_url(view) + parentid + '/' + id + '/';
	console.log('DELETE ' + url);
	$.ajax({
		url: url,
		type: 'DELETE',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		complete: function(xml) {
			trow.parent().remove();
		},
	});
}

/******************************************************************************/
/* build xml and submit form */
function submitForm(object, action, id) {
	var xml = createRequestXml();
	var url = '';
	var collection = '';
	var mytab = activeTab();

	/* if object has subforms, which xml tag do we wrap them in? */
	if (object == 'salesorder') {
		var subobject = 'salesorderitem';
	}

	console.log('Submitting form ' + object + ':' + action);

	/* find out where to send this */
	mytab.find(
		'div.' + object
	).find('form:not(.subform)').each(function() {
		collection = $(this).attr('action');
		url = collection_url(collection);
		if (id) {
			url += id;
		}
	});

	console.log('submitting to url: ' + url);

	/* build xml request */
	xml += '<' + object 
	if (id > 0) {
		xml += ' id="' + id + '"';
	}
	xml += '>';
	mytab.find(
		'div.' + object
	).find('input:not(.nosubmit,default),select:not(.nosubmit,.default)').each(function() {
		var name = $(this).attr('name');
		if (name) {
			console.log('processing input ' + name);
			if ((name != 'id')
			&& ((name != 'relationship')||(object == 'organisation_contacts')))
			{
				console.log($(this).val());
				if ($(this).hasClass('sub')) {
					/* this is a subform entry, so add extra xml tag */
					xml += '<' + subobject + '>';
				}
				if ($(this).val()) {
					if ($(this).val().length > 0) { /* skip blanks */
						xml += '<' + name + '>';
						xml += escapeHTML($(this).val());
						xml += '</' + name + '>';
					}
				}
				if ($(this).hasClass('endsub')) {
					/* this is a subform entry, so close extra xml tag */
					xml += '</' + subobject + '>';
				}
			}
		}
	});

	xml += '</' + object + '>';
	xml += '</data></request>';

	showSpinner('Saving ' + object + '...'); /* tell user to wait */

	/* send request */
    $.ajax({
        url: url,
        type: 'POST',
        data: xml,
        contentType: 'text/xml',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
        success: function(xml) { submitFormSuccess(object, action, id, collection); },
        error: function(xml) { submitFormError(object, action, id); },
    });
}

/******************************************************************************/
/* Replace HTML Special Characters */
function escapeHTML(html) {
	var x;
	var hchars = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
	};

	for (x in hchars) {
		html = html.replace(new RegExp(x, 'g'), hchars[x]);
	}

	return html;
}

/******************************************************************************/
function submitFormSuccess(object, action, id, collection) {
	statusMessage(object + ' saved', STATUS_INFO, 5000);

	if (object == 'business') {
		prepBusinessSelector();
	}

	// lets check for tabs that will need refreshing
	$('div.refresh.' + collection).each(function() {
		var tabid = $(this).attr('id').substr(3);
		var title = $('#tabli' + tabid).find(
			'a[href="' + tabid + '"]:not(.tabcloser)'
		).text();
		showQuery(collection, title, false, tabid);
	});

	if (action == 'create') {
		/* clear form ready for more data entry */
		var mytab = $('div.tablet.active.business' + g_business);
		var myform = mytab.find('div.' + object + '.' + action);
		var tab = activeTabId();

		getForm(object, action, null, null, tab);
	}

	hideSpinner();
}

/******************************************************************************/
function submitFormError(object, action, id) {
	hideSpinner();
	statusMessage('Error saving ' + object, STATUS_CRIT);
}

/******************************************************************************/
/* return the singular object name for a given collection */
function collectionObject(c) {
	if (c == 'taxes') {
		return 'tax';
	}
	else {
		/* the general case
		 * - lop off the last character and hope for the best */
		return c.substring(0, c.length - 1);
	}
}

/******************************************************************************/
/* Fetch an individual element of a collection for display / editing */
function displayElement(collection, id) {
	var object = collectionObject(collection);
	var action = 'update';
	var title = 'Edit ' + object.substring(0,1).toUpperCase()
		+ object.substring(1) + ' ' + id;
	var dataURL = collection_url(collection) + id;
	var formURL = '/html/forms/' + object + '/' + action + '.html';

	showSpinner(); /* tell user to wait */

	/* fetch the xml and html we need, then display the form */
	$.when(
		getXML(dataURL),
		getHTML(formURL)
	)
	.done(function(xml, html) {
		/* all data is in, display form */
		displayForm(object, action, title, html[0], xml[0]);
	})
	.fail(function() {
		/* something went wrong */
		statusMessage('error loading data', STATUS_CRIT);
		hideSpinner();
	});
}

/******************************************************************************/
function getHTML(url) {
	return $.ajax({
		url: url,
		type: 'GET',
		dataType: 'html',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
	});
}
/******************************************************************************/
function getXML(url) {
	return $.ajax({
		url: url,
		type: 'GET',
		dataType: 'xml',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
	});
}

/******************************************************************************/
/* display XML results as a sortable table */
function displayResultsGeneric(xml, collection, title, sorted, tab) {
	var refresh = false;

	/* TODO: refactor */
	if (collection == 'contacts') {
		refresh = true;
	}
	else if (collection == 'organisations') {
		refresh = true;
	}
	else if (collection == 'products') {
		refresh = true;
	}

	if ($(xml).find('resources').children().length == 0) {
		/* No results found */
		hideSpinner();
		if (collection == 'contacts') {
			getForm('contact', 'create', 'Add New Contact');
		}
		else if (collection == 'organisations') {
			getForm('organisation', 'create', 'Add New Organisation');
		}
		else {
			addTab(title, "<p>Nothing found</p>", true);
		}
		return;
	}

	$t = '<a class="source" href="' + collection_url(collection) + '"/>';
	$t += '<table class="datatable ' + collection + '">';
	$t += "<thead>";
	$t += "<tr>";
	var row = 0;
	$(xml).find('resources').children().each(function() {
		row += 1;
		if (row == 1) {
			$(this).children().each(function() {
				$t += '<th class="xml-' + this.tagName + '">';
				$t += this.tagName + '  </th>';
			});
			$t += "</tr>";
			$t += "</thead>";
			$t += "<tbody>";
		}
		if (row % 2 == 0) {
			$t += '<tr class="even ' + this.tagName  + '">';
		} else {
			$t += '<tr class="odd ' + this.tagName  + '">';
		}
		$(this).children().each(function() {
			$t += '<td class="xml-' + this.tagName + '">'
			if ((this.tagName == 'price_buy')||(this.tagName == 'price_sell')){
				$t += decimalPad($(this).text(), 2);
			}
			else if (this.tagName == 'nominalcode'){
				$t += padString($(this).text(), 4);
			}
			else {
				$t += $(this).text();
			}
			/* if this is a numeric value, and positive, add trailing space */
			if ((this.tagName == 'debit') || (this.tagName == 'credit') 
			 || (this.tagName == 'total') || (this.tagName == 'amount'))
			{
				if ($(this).text().substr(-1) != ')') {
					$t += ' ';
				}
			}
			$t += '</td>';
		});
		$t += "</tr>";
	});
	$t += "</tbody>";
	$t += "</table>";

	if (! title) {
		title = "Results";
	}

	$t = $($t); /* htmlify */

	/* attach click event */
	$t.find('tr').click(function(event) {
		event.preventDefault();
		displayElement(collection,$(this).find('td.xml-id').text());
	});

	if (tab) {
		/* refreshing existing tab */
		updateTab(tab, $t);
	}
	else {
		addTab(title, $t, true, collection, refresh);
	}

	/* make our table pretty and sortable */
	if (sorted) {
		$('.tablet.active.business' + g_business).find(".datatable").tablesorter({
			sortList: [[0,0], [1,0]], 
			widgets: ['zebra'] 
		});
	}

	hideSpinner();
}

/******************************************************************************/
/* hide please wait dialog */
function showSpinner(message) {
	if (message) {
		$('.spinwaittxt').text(message);
	}
	else {
		$('.spinwaittxt').text('Please wait...');
	}
	$("#loading-div-background").show();
}

/******************************************************************************/
/* hide please wait dialog */
function hideSpinner() {
	$("#loading-div-background").hide();
}

/******************************************************************************/
/* Populate Accounts Drop-Downs with XML Data */
function populateAccountsDDowns(xml, tab) {
	$('select.account').empty();
	$('select.account').append(
		$("<option />").val(0).text('<select account>')
	);
	$(xml).find('row').each(function() {
		var accountid = $(this).find('nominalcode').text();
		accountid = padString(accountid, 4); /* pad code with leading zeros */
		var accounttype = $(this).find('type').text();
		var accountdesc = accountid + " - " +
		$(this).find('account').text();

		$('select.account').append(
			$("<option />").val(accountid).text(accountdesc)
		);
	});

	finishJournalForm(tab);
}

/******************************************************************************/
function populateDepartmentsDDowns(xml, tab) {
	$('select.department').empty();
	$(xml).find('row').each(function() {
		var id = $(this).find('id').text();
		var name = $(this).find('name').text();
		$('select.department').append(
			$("<option />").val(id).text(name)
		);
	});
}

/******************************************************************************/
function populateDivisionsDDowns(xml, tab) {
	$('select.division').empty();
	$(xml).find('row').each(function() {
		var id = $(this).find('id').text();
		var name = $(this).find('name').text();
		$('select.division').append(
			$("<option />").val(id).text(name)
		);
	});
}

/******************************************************************************/
/* debits and credits */
function populateDebitCreditDDowns() {
	$('select.type:not(.populated)').empty();
	$('select.type:not(.populated)').append(
		$("<option />").val('debit').text('debit')
	);
	$('select.type:not(.populated)').append(
		$("<option />").val('credit').text('credit')
	);
	$('select.type:not(.populated)').addClass('populated');
}

/******************************************************************************/
/* return url for collection */
function collection_url(collection) {
	var url;
	url =  '/' + g_instance + '/' + g_business + '/' + collection + '/';
	return url;
}

/******************************************************************************/
/* set up journal form */
function setupJournalForm(tab) {

	/* load dropdown contents */
	$.ajax({
		url: collection_url('divisions'),
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function (xml) {
			populateDivisionsDDowns(xml, tab);
		}
	});

	$.ajax({
		url: collection_url('departments'),
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function (xml) {
			populateDepartmentsDDowns(xml, tab);
		}
	});

	$.ajax({
		url: collection_url('accounts'),
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function (xml) {
			populateAccountsDDowns(xml, tab);
		}
	});

	populateDebitCreditDDowns();
}

/******************************************************************************/
/* show the form, after setup is complete */
function finishJournalForm(tab) {
	var ledger_lines = 1;
	var jf = $('div.dataformdiv.template').clone();
	jf.removeClass('template');
	if (tab) {
		/* clear existing tab */
		tab.empty();
		tab.append(jf);
	}
	else {
		/* clone template into new tab */
		addTab('Journal Entry', jf, true);
	}

	/* add some ledger lines */
	var jl = jf.find('fieldset.ledger').clone();
	while (ledger_lines < g_max_ledgers_per_journal) {
		jf.find('form').append(jl.clone());
		ledger_lines++;
	}

	/* add datepicker */
	var transactdate = jf.find('.transactdate');
	var currentDate = new Date();
	transactdate.val($.now());
	transactdate.datepicker({
		dateFormat: "yy-mm-dd",
		constrainInput: true
	});
	transactdate.datepicker("setDate",currentDate);

	/* set up click() events */
	$('button#journalsubmit').click(function(event) {
		submitJournalEntry(event, jf);
	});

	/* set up blur() events */
	$('div.tablet.active.business'
						+ g_business).find('input.amount').each(function() {
		$(this).blur(function() {
			/* pad amounts to two decimal places */
			var newamount = decimalPad($(this).val(), 2);
			if (newamount == '0.00') {
				/* blank out zeros */
				$(this).val('');
			}
			else {
				$(this).val(newamount);
			}
		});
	});

	/* display the form */
	jf.fadeIn(300);
	jf.find('p.journalstatus').fadeOut(5000);

	/* set focus */
	jf.find(".description").focus();

	/* set up input validation events */
	/* TODO */

}

/******************************************************************************/
/* validate journal entry form and return xml to submit */
function validateJournalEntry(form) {
	var xml = createRequestXml();
	var account;
	var division = 0;
	var department = 0;
	var type;
	var amount;
	var debits = 0;
	var credits = 0;
	var debitxml = '';
	var creditxml = '';

	$(form).find('p.journalstatus').text("");
	$(form).find('fieldset').children().each(function() {
		if ($(this).hasClass('description')) {
			/* ensure we have a description */
			if ($(this).val().trim().length == 0) {
				$(form).find('p.journalstatus').text(
					"A description is required"
				);
				$(form).find('p.journalstatus').fadeIn(300);
				xml = false;
				return false;
			}
			xml = createRequestXml();
			xml += '<journal ';
			xml += 'transactdate="' + $(form).find('.transactdate').val()
				+ '" ';
			xml += 'description="'+ escapeHTML($(this).val().trim()) +'">';
		}
		else if ($(this).hasClass('account')) {
			account = $(this).val();
		}
		else if ($(this).hasClass('division')) {
			division = $(this).val();
		}
		else if ($(this).hasClass('department')) {
			department = $(this).val();
		}
		else if ($(this).hasClass('type')) {
			type = $(this).val();
		}
		else if ($(this).hasClass('amount')) {
			amount = $(this).val();
			console.log('amount: ' + amount);
			if ((Number(amount) > 0) && (Number(account) >= 0)) {
				if (type == 'debit') {
					debits = decimalAdd(debits, amount);
					debitxml += '<' + type + ' account="' + account;
					debitxml += '" division="' + division;
					debitxml += '" department="' + department;
					debitxml += '" amount="' + amount + '"/>';
				}
				else if (type == 'credit') {
					credits = decimalAdd(credits, amount);
					creditxml += '<' + type + ' account="' + account;
					creditxml += '" division="' + division;
					creditxml += '" department="' + department;
					creditxml += '" amount="' + amount + '"/>';
				}
			}
			console.log('debits: ' + debits);
			console.log('credits: ' + credits);
		}
	});
	if (xml) {
		xml += debitxml;
		xml += creditxml;
		xml += '</journal></data></request>';
	}

	/* quick check to ensure debits - credits = 0 */
	console.log('debits=' + debits);
	console.log('credits=' + credits);
	if (!(decimalEqual(debits, credits))) {
		$(form).find('p.journalstatus').text("Transaction is unbalanced");
		$(form).find('p.journalstatus').fadeIn(300);
		xml = false;
	}
	if (decimalEqual(decimalAdd(debits, credits), 0)) {
		$(form).find('p.journalstatus').text("Transaction is zero");
		$(form).find('p.journalstatus').fadeIn(300);
		xml = false;
	}

	return xml;
}

/******************************************************************************/
/* Javascript has no decimal type, so we need to teach it how to add up */
function decimalAdd(x, y) {

	x = new Big(x);
	y = new Big(y);

	return x.plus(y);

}

/******************************************************************************/
/* Compare two string representations of decimals numerically */
function decimalEqual(term1, term2) {
	return (Number(term1) == Number(term2));
}

/******************************************************************************/
/* Return string representation of decimal padded to at least <digits> 
 * decimal places */
function decimalPad(decimal, digits) {
	/* if decimal is blank, or NaN, make it zero */
	if ((isNaN(decimal)) || (decimal == '')) {
		decimal = '0';
	}

	/* first, convert to a number and back to a string - this strips any 
	 * useless leading and trailing zeros. We'll put back the ones we need. */
	decimal = String(Number(decimal));

	var point = String(decimal).match(/\./g);

	if (point) {
		pindex = String(decimal).indexOf('.');
		places = String(decimal).length - pindex - 1;
		if (places < digits) {
			decimal = String(decimal) + Array(digits).join('0');
		}
	}
	else if (digits == 0) {
		decimal = String(decimal);
	}
	else if (digits > 0) {
		decimal = String(decimal) + '.' + Array(digits + 1).join('0');
	}
	return decimal;
}

/******************************************************************************/
/* pad out a string with leading zeros */
function padString(str, max) {
	return str.length < max ? padString("0" + str, max) : str;
}

/******************************************************************************/
function roundHalfEven(n, dp) {
	var x = Big(n);
	return x.round(dp, 2);
}

/******************************************************************************/
function submitJournalEntry(event, form) {
	event.preventDefault();
	xml = validateJournalEntry(form);
	if (!xml) {
		return;
	}

	showSpinner();
    $.ajax({
		url: collection_url('journals'),
        type: 'POST',
		data: xml,
        contentType: 'text/xml',
		beforeSend: function (xhr) { setAuthHeader(xhr); },
        success: function(xml) { submitJournalEntrySuccess(xml); },
        error: function(xml) { submitJournalEntryError(xml); },
    });
}

/******************************************************************************/
/* journal was posted successfully */
function submitJournalEntrySuccess(xml) {
	$('p.journalstatus').text("Journal posted");
	$('p.journalstatus').fadeIn(300);
	var activeForm = $('.tablet.active');
	setupJournalForm(activeForm);
	hideSpinner();
}

/******************************************************************************/
/* problem posting journal */
function submitJournalEntryError(xml) {
	$('p.journalstatus').text("Error posting journal");
	$('p.journalstatus').fadeIn(300);
	hideSpinner();
}

/******************************************************************************/
/* Start building an xml request */
function createRequestXml() {
	var xml = '<?xml version="1.0" encoding="UTF-8"?><request>';
	xml += '<instance>' + g_instance + '</instance>';
	xml += '<business>' + g_business + '</business>';
	xml += '<data>';
	return xml;
}

/******************************************************************************/
/* create business selector combo */
function prepBusinessSelector() {
	$.ajax({
		url: collection_url('businesses'),
		beforeSend: function (xhr) { setAuthHeader(xhr); },
		success: function(xml) {
			showBusinessSelector(xml);
		},
		error: function(xml) {
			getForm('business', 'create', 'Add New Business');
		}
	});
}

/******************************************************************************/
/* Display combo for switching between businesses */
function showBusinessSelector(xml) {
	if ($(xml).find('row').length == 0) {
		/* No businesses found */
		getForm('business', 'create', 'Add New Business');
		return;
	}

	select = $('select.businessselect');
	select.empty();

	$(xml).find('row').each(function() {
		var id = $(this).find('id').text();
		var name = $(this).find('name').text();
		select.append($("<option />").val(id).text(name));
	});
	
	select.change(function() {
		switchBusiness($(this).val());
	});

	$('select.businessselect').val(g_business);
}

/******************************************************************************/
/* Switch to the selected business */
function switchBusiness(business) {
	/* hide content of active tab */
	$('.tablet.active').addClass('hidden');

	/* hide all tabheads for this business */
	$('.tabhead.business' + g_business).each(function() {
		$(this).addClass('hidden');
	});

	/* switch business */
	g_business = business;

	/* unhide tabs for new business */
	$('.tabhead.business' + g_business).each(function() {
		$(this).removeClass('hidden');
	});
	$('.tablet.business' + g_business).each(function() {
		$(this).removeClass('hidden');
	});
}

/******************************************************************************/
function loadMap(locationString, tab) {
	var canvas;
	var map;
	var geocoder = new google.maps.Geocoder();

	var mapOptions = {
	    zoom: 15,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	}

	if (tab) {
		mytab = getTabById(tab);
	}
	else {
		mytab = activeTab();
	}

	mytab.find('.map-canvas').each(function() {
		console.log('found a map-canvas');
		canvas = this;
		$(canvas).fadeIn(300);
		map = new google.maps.Map(canvas, mapOptions);
	});

	if (!(map)) {
		console.log('No map-canvas found');
		return;
	}

	geocoder.geocode( { 'address': locationString}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			map.setCenter(results[0].geometry.location);
			var marker = new google.maps.Marker({
				map: map,
				position: results[0].geometry.location
			});
		} else {
			console.log("Geocode was not successful for the following reason: "
				+ status);
		}
	});
}
