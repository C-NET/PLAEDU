
// This global variable is where all the script goes so that
// it doesn't polute the global namespace
var MYAPP = MYAPP || {};

var listView;
var shareCounter;
var shareCounterMax = 30;

MYAPP.run = (function () {

    var initialView = "home";
    var now = new Date();
    var expireDate = new Date(2015, 1, 11); // Fecha de caducidad: 10/02/2015 TODO: Definir fecha de caducidad

    if (now >= expireDate)
        initialView = "appexpired";

    // create the Kendo UI Mobile application
    MYAPP.app = new kendo.mobile.Application(document.body, {
        skin: "flat",
        initial: initialView
    });

    //window.plugins.emailComposer = new EmailComposer();

    $("#shareCounterMax").html(shareCounterMax);

    if (!window.localStorage.getItem("counter")) {
        window.localStorage.setItem("counter", shareCounterMax);
    }

    shareCounter = parseInt(window.localStorage.getItem("counter"), 10); // Base 10

});


// this is called when the initial view shows. it prevents the flash
// of unstyled content (FOUC)
MYAPP.search = (function (e) {
    e.preventDefault();
    if(window.spinnerplugin != null)
        window.spinnerplugin.show();
    MYAPP.abstracts.read();
    if (MYAPP.abstracts.total() > 0) {
        MYAPP.app.navigate("#articulos");
        if (listView == null)
            listView = $('#result-list').data("kendoMobileListView");        
        listView.refresh();
        //ORDENAMIENTO
        var indice = $("#buttongroup").data("kendoMobileButtonGroup").selectedIndex;
        //Si esta chequeada la categoria
        if (indice == 0) {
            MYAPP.abstracts.sort({ field: "title", dir: "asc" });
            MYAPP.abstracts.group({ field: "category" });
        }

        //Si esta chequeado el titulo
        else if (indice== 1) {
            MYAPP.abstracts.sort({ field: "title", dir: "asc" });
            MYAPP.abstracts.group([]);
            //CORRECCION BUG DE KENDO 
            $('#result-list').removeClass("km-listgroup");
            $('#result-list').addClass("km-list");
            /////////////////////////
        }       
        //Si esta chequeado el acronimo
       else if (indice == 2) {
            MYAPP.abstracts.group({ field: "subtitle" });
            MYAPP.abstracts.filter({ field: "subtitle", operator: "neq", value: "" });
        }
    }
    else {        
        MYAPP.app.navigate("#NotFound");
    }
    if (window.spinnerplugin != null)
        window.spinnerplugin.hide();
});

// this function runs at startup and attaches to the 'deviceready' event
// which is fired by PhoneGap when the hardware is ready for native API
// calls. It is self invoking and will run immediately when this script file is 
// loaded.
(function () {
    if (navigator.userAgent.indexOf('Browzr') > -1) {
        // blackberry
        setTimeout(MYAPP.run, 250);
    } else {
        // attach to deviceready event, which is fired when phonegap is all good to go.
        document.addEventListener('deviceready', MYAPP.run, false);
    }
    MYAPP.idx = MYAPP.getIndex();
    MYAPP.src = MYAPP.getData();
    MYAPP.cat = MYAPP.getCategories();

})();

//FILTRA LOS ARTICULOS POR BÚSQUEDA
MYAPP.abstracts = new kendo.data.DataSource({
    transport: {
        read: function (options) {            
            var categoryCodes = 0;
            //Recorro los checkbox de categorías
            for (var k = 0; k < 9; k++)
            {
                //Si está chequeado agrego la categoría a categoryCodes.
                if ($("#chkCat"+k)[0].checked)
                    categoryCodes |= (1 << (4+k));
            }
            // Retorna las páginas que coinciden.

            var data = MYAPP.find($(".search-text").val(), categoryCodes);
            options.success(data);
            
        } 
    }   
});


//FUNCIONALIDAD BOTÓN COMPARTIR
MYAPP.sendMail = function (e) {

    if (shareCounter < 1) {
        openShareLimitModal();
        return;
    }
    else {
        window.localStorage.setItem("counter", --shareCounter);
    }

    var data = e.button.data();
    var now = new Date();
    var linkAndroid = 'https://play.google.com/store/search?q=Cardio%20Trials&c=apps';
    var linkiOS = 'https://ssl.apple.com/search/?q=cardio%20trials';
    //Concatena día, fecha, hora, segundos
    var strDateTime = [[AddZero(now.getDate()), AddZero(now.getMonth() + 1), now.getFullYear()].join("-"), [AddZero(now.getHours()), AddZero(now.getMinutes())].join(""), AddZero(now.getSeconds())].join("");   
    var asunto = 'Abstract de terape\u00fatica cardiovascular';
    var cuerpo = 'Adjunto el siguiente abstract del libro \"Trials de la Terap\u00e9utica Cardiovascular\" que puede resultar de tu inter\u00e9s: ' + data.title + '\n\n Te recomiendo Cardio Trials, una aplicaci\u00f3n de Novartis Argentina que permite buscar y compartir todos los abstracts de la 9na. edici\u00f3n del libro \"Trials de la Terap\u00e9utica Cardiovascular\".\n\n Podr\u00e1s descargar Cardio Trials en forma gratuita hasta el 10/02/2015 desde las Tiendas de Aplicaciones de:\n\n iOS (App Store)\n' + linkiOS + '\n\n Android (Google Play)\n' + linkAndroid;
    window.plugins.emailComposer.showEmailComposer(asunto, cuerpo, null, null, null, false, null, [['Articulo_' + strDateTime + '.html', data.base64]]);
};
MYAPP.compartirAplicacion = function () {
    var linkAndroid = 'https://play.google.com/store/search?q=Cardio%20Trials&c=apps';
    var linkiOS = 'https://ssl.apple.com/search/?q=cardio%20trials';
    var asunto = 'Te recomiendo esta aplicaci\u00f3n!';
    var cuerpo = 'Te recomiendo Cardio Trials, una aplicaci\u00f3n de Novartis Argentina que permite buscar y compartir todos los abstracts de la 9na. edici\u00f3n del libro \"Trials de la Terap\u00e9utica Cardiovascular\". \n\n Podr\u00e1s descargar esta aplicaci\u00f3n en forma gratuita hasta  el 10/02/2015 desde las Tiendas de Aplicaciones de:\n\n iOS (App Store)\n' + linkiOS + '\n\n Android (Google Play)\n' + linkAndroid;
    window.plugins.emailComposer.showEmailComposer(asunto, cuerpo, null, null, null, false, null,null);
};

//Pad given value to the left with "0"
function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}


MYAPP.openUrl = function (url)
{
    window.open(url);
}


//BUSCA EL INDICE DEL ARTICULO DE LA PALABRA ENCONTRADA
MYAPP.find = function (key, categories) {
    var idx = MYAPP.idx; 
    key = key.toLowerCase();
    var match = [];
    // Recorre el índice

    var encontrado = 0;
    for (var i = 0; i < idx.length; i++)
    {
        var idxi = idx[i];

        // Compara la categoria del grupo contra la categorías que se buscan
        if ((idxi.cat & categories) != 0)
        {
            var cmp = idxi.key.substring(0, key.length) === key;
            
            if (cmp) {
                encontrado = 1;
                var count = idxi.src.length;

                // Se agregan todos los subindices de los artículos sin repetir.
                for (var j = 0; j < count; j++) {
                    var e = idxi.src[j];

                    // Si está repetido no se agrega
                    if (match.indexOf(e) < 0)
                        match.push(e);
                }
            }
            else if (encontrado == 1)
            {
                break;
            }
        }

    }

    var data = [];
    //Filtra los artículos por categoría
    for (var i = 0; i < match.length;    i++) {
        var art = MYAPP.src[match[i]];
        if ((art.categoryCode & categories) != 0)
            data.push(art);
        if (data.length > 99) { return data;}
            
    }
    return data;
};

MYAPP.cambiarArticulo = function (indice, direccion) {
    if (indice < 0 || indice > 512) return false;
    MYAPP.app.navigate("\#abstracts/" + MYAPP.src[indice].article, 'slide:'+direccion);
};

//Obtiene el nombre de la categoría mediante el código.
MYAPP.getCategoryName = function (categoryCode) {
    var cat = MYAPP.cat;

    for (var i = 0; i < cat.length; i++)
        if (cat[i].id == categoryCode)
            return cat[i].desc;

    return "";
}

MYAPP.CheckAll = function (e) {
    // Listen for click on toggle checkbox
    if ($('#chkCatTodas')[0].checked) {
        // Iterate each checkbox
        $(':checkbox').each(function () {
            this.checked = true;
        });
    }
    else { // Iterate each checkbox 
        $(":checkbox").each(function () { this.checked = false; });
    }

}

MYAPP.navigateToArticle = function (article)
{
    MYAPP.app.navigate(article);
}


MYAPP.scrollTop = function (e) {
    e.preventDefault();
    var scroller = e.view.scroller;
    scroller.reset(); 
};

MYAPP.hideFooter = function (e) {
    $(".km-tabstrip").hide();
};

MYAPP.showFooter = function (e) {
    $(".km-tabstrip").show();
};

function seleccionarRadioButton() {
    var buttongroup = $("#buttongroup").data("kendoMobileButtonGroup");
    // selects by jQuery object
    buttongroup.select(buttongroup.element.children().eq(0));
    // selects by index
    buttongroup.select(0);
}


MYAPP.indexList = new kendo.data.DataSource({
    transport: {
        read: function (options) {
            options.success(MYAPP.src);
        }
    },
    serverPaging: true,
    serverSorting: true,
    pageSize:60
});

/*Lista Indice Principal*/
function indexListviewInit() {
    if (window.spinnerplugin != null)
        window.spinnerplugin.show();
    $("#indexListview").kendoMobileListView({
        dataSource: MYAPP.indexList,
        template: $("#item-template-index").text(),
        endlessScroll: true
    });
    if (window.spinnerplugin != null)
        window.spinnerplugin.hide();
}


function openShareLimitModal() {
    $("#sharelimit").data("kendoMobileModalView").open();
}

function closeShareLimitModal() {
    $("#sharelimit").data("kendoMobileModalView").close();
}

