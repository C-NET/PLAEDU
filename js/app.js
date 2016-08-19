/// <reference path="jaydata-vsdoc.js" />

var LOG_ERRORS = true;
var RIPPLE = window.tinyHippos != undefined;
var WP8 = navigator.userAgent.match('Trident'); // Trident incluye IE en Windows. 'IEMobile' para WP8.

// Configuración de servidores
// 
//var WEBAPI = "http://localhost:59329/api";
//var WEBAPI = "http://fdcotic-001-site4.atempurl.com/api";
var WEBAPI = "http://10.0.0.25/PlaEduV2.Web/api";
var WEBAPI_SERVER = WP8 ? "http://10.0.0.25/PlaEduV2.Web" : "http://10.0.0.25/PlaEduV2.Web";
var IMG_DOWNLOAD_SERVER = WP8 ? "http://10.0.0.25/PlaEduV2.Web/" : "http://10.0.0.25/PlaEduV2.Web/";
var ODATA_SERVER = (RIPPLE) ? "http://10.0.0.25/PlaEduV2.Web/oData" : WEBAPI_SERVER + "/odata";

// Variables globales
var gSynchronizing = false;
var gConfigLoaded = false;

// ViewModels
var loginVM = kendo.observable({
    email: "",
    password: "",
    validator: null,
    authenticationResult: "",
    isResultVisible: function () {
        return this.get("authenticationResult") != "";
    }
});

var newcommentmailVM = kendo.observable({
    pathologies: [],
    experts: [],
    selectedPathology: null,
    selectedExpert: null,
    isFirstCommentMail: true,
    subject: "",
    text: "",
    commentMailEntity: null,
    caseEntity: null,
    closeCase: false,
    validator: null
});

var casesVM = kendo.observable({
    cases: {},
    myCases: false,
});

var caseVM = kendo.observable({
    caseEntity: null,
    getCommentMails: function () {

        if (!this.caseEntity)
            return;

        var database = null;

        if (casesVM.myCases)
            database = $plaedu.context;
        else
            database = $plaedu.context.remote;

        return database.CommentMails
                .filter(function (commentMail) { return commentMail.CaseUid == this.caseUid; }, { caseUid: this.caseEntity.CaseUid })
                .orderBy("it.DateTime")
                .asKendoDataSource();
    },
    getCommentMailImages: function (commentUid) {

        var database = null;

        if (casesVM.myCases)
            database = $plaedu.context;
        else
            database = $plaedu.context.remote;

        return database.Images
                .filter(function (image) { return image.CommentUid == this.commentUid; }, { commentUid: commentUid })
                .orderBy("it.FileName")
                .asKendoDataSource();
    },
    getCaseStateDescription: function () {

        if (!this.caseEntity)
            return;

        var caseStateDescription = "";

        if (this.caseEntity.CaseStateId == CaseStates.Rejected)
            caseStateDescription = "Rechazado";

        if (this.caseEntity.CaseStateId == CaseStates.Published)
            caseStateDescription = "Publicado";

        if (this.caseEntity.CaseStateId == CaseStates.Closed)
            caseStateDescription = "Cerrado. Publicaci\u00f3n pendiente.";

        return caseStateDescription;
    }
});

var userVM = kendo.observable({
    userId: -1,
    userTypeId: -1,
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    password: "",
    specialties: [],
    selectedSpecialty: null,
    countries: [],
    selectedCountry: null,
    active: false,
    authenticationResult: "",
    isResultVisible: function () {
        return this.get("authenticationResult") != "";
    },
    isCreateButtonEnabled: true,
    validator: null
});

var filtercasesVM = kendo.observable({
    pathologies: [],
    experts: [],
    selectedPathology: -1,
    selectedExpert: -1,
    freeSearchText: "",
    validator: null
});

var contentsVM = kendo.observable({
    contents: []
});

var modalmessageVM = kendo.observable({
    title: "",
    description: ""
});


var confirmCloseCaseVM = kendo.observable({
    caseTitle: "",
    finalComment: "",
    validator: null
});


// Enumeraciones
var CaseStates = {
    None: 0,
    MsgUsrPendingFQ: 1,
    MsgUsrFQ: 2,
    Rejected: 3,
    MsgExp: 4,
    ExpRejectedFQ: 5,
    MsgExpClose: 6,
    MsgUsrPending: 7,
    MsgUsr: 8,
    ExpRejected: 9,
    ClosePending: 10,
    Closed: 11,
    Published: 12
}

var UserTypes = {
    Anonymous: 0,
    Doctor: 1,
    Expert: 2,
    ContentAdministrator: 3
}

var app = {
    //-------------Inicio App Initialization-------------

    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },

    // Bind Event Listeners. Bind any events that are required on startup. Common events are: 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);

        // Global error handling
        if (!WP8) {
            window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
                alert('Error: ' + errorMsg + ' Line: ' + lineNumber);
            }
        }
    },

    // deviceready Event Handler
    onDeviceReady: function () {

        document.addEventListener("offline", app.onOffline, false);
        document.addEventListener("online", app.onOnline, false);

        app.run();
    },

    run: function () {

        app.createKendoApp();

        app.bindControlEvents();

        app.defineDataModel();

        app.instantiateContexts();
    },

    createKendoApp: function () {

        var initialView = "login";

        // Create the Kendo UI Mobile application
        app.kendoapp = new kendo.mobile.Application(document.body, {
            skin: "flat",
            initial: initialView,
            browserHistory: true
        });

        kendo.culture("es-AR");
    },

    bindControlEvents: function () {

        $("#attachedImages").on('click', ':button', function (e) {
            app.deleteImage($(this));
        });

        $("#sync").click(app.sync);

        $("#logout").click(app.logout);
    },

    defineDataModel: function () {

        $data.Entity.extend('$plaedu.Types.CommentMail', {
            CommentUid: { type: 'Edm.Guid', key: true },
            CaseUid: { type: 'Edm.Guid', required: true },
            ToUserId: { type: 'Edm.Int32', required: true },
            Subject: { type: 'Edm.String', required: true },
            UserId: { type: 'Edm.Int32', required: true },
            UserFullName: { type: 'Edm.String', required: true },
            Text: { type: 'Edm.String', required: true },
            DateTime: { type: 'Edm.DateTime', required: true },
            ImageCount: { type: 'Edm.Int32', required: true },
            Sync: { type: 'Edm.Boolean', required: false }
        });

        $data.Entity.extend('$plaedu.Types.Image', {
            ImageUid: { type: 'Edm.Guid', key: true },
            CommentUid: { type: 'Edm.Guid', required: true },
            FileName: { type: 'Edm.String', required: true },
            ImageURI: { type: 'Edm.String', required: false },
            UserId: { type: 'Edm.Int32', required: false },
            Sync: { type: 'Edm.Boolean', required: false },
            Uploaded: { type: 'Edm.Boolean', required: false }
        });

        $data.Entity.extend('$plaedu.Types.Case', {
            CaseUid: { type: 'Edm.Guid', key: true },
            Title: { type: 'Edm.String', required: true },
            ExpertUserId: { type: 'Edm.Int32', required: true },
            CaseStateId: { type: 'Edm.Int32', required: true },
            LastChangeDateTime: { type: 'Edm.DateTime', required: true },
            PathologyId: { type: 'Edm.Int32', required: true },
            UserId: { type: 'Edm.Int32', required: true },
            UserTypeId: { type: 'Edm.Int32', required: false },
            Sync: { type: 'Edm.Boolean', required: false }
        });

        $data.Entity.extend('$plaedu.Types.Pathology', {
            Id: { type: 'Edm.Int32', key: true },
            Description: { type: 'Edm.String', required: true }
        });

        $data.Entity.extend('$plaedu.Types.Expert', {
            Id: { type: 'Edm.Int32', key: true },
            Description: { type: 'Edm.String', required: true }
        });

        $data.Entity.extend('$plaedu.Types.Specialty', {
            Id: { type: 'Edm.Int32', key: true },
            Description: { type: 'Edm.String', required: true }
        });

        $data.Entity.extend('$plaedu.Types.Country', {
            Id: { type: 'Edm.Int32', key: true },
            Description: { type: 'Edm.String', required: true }
        });

        $data.Entity.extend('$plaedu.Types.User', {
            UserId: { type: 'Edm.Int32', key: true },
            UserTypeId: { type: 'Edm.Int32', required: true },
            CountryId: { type: 'Edm.Int32', required: true },
            FirstName: { type: 'Edm.String', required: true },
            LastName: { type: 'Edm.String', required: true },
            Email: { type: 'Edm.String', required: true },
            Password: { type: 'Edm.String', required: false },
            Active: { type: 'Edm.Boolean', required: true },
            SpecialtyId: { type: 'Edm.Int32', required: false }
        });

        $data.Entity.extend('$plaedu.Types.Content', {
            ContentId: { type: 'Edm.Int32', key: true },
            ContentTypeId: { type: 'Edm.Int32', required: true },
            Title: { type: 'Edm.String', required: true },
            Description: { type: 'Edm.String', required: true },
            Path: { type: 'Edm.String', required: true }, // Deberia llamarse ContentURL
            PublishDateTime: { type: 'Edm.DateTime', required: true },
            ExpertUserFullName: { type: 'Edm.String', required: true },
            ContentAdminFullName: { type: 'Edm.String', required: true },
            PathologiesDescription: { type: 'Edm.String', required: true },
            UserId: { type: 'Edm.Int32', required: true }
        });

        //$data.Entity.extend('$plaedu.Types.AuthenticationResult', {
        //    AccountLocked: { type: 'Edm.Boolean', required: true },
        //    Authenticated: { type: 'Edm.Int32', required: true },
        //    Attempts: { type: 'Edm.Int32', required: true },
        //    Email: { type: 'Edm.String', required: true },
        //    Password: { type: 'Edm.String', required: false },
        //    Message: { type: 'Edm.String', required: true },
        //    User: { type: '$plaedu.Types.User', required: false }
        //});

        $data.EntityContext.extend('$plaedu.Types.PlaeduContext', {
            CommentMails: { type: $data.EntitySet, elementType: $plaedu.Types.CommentMail },
            Images: { type: $data.EntitySet, elementType: $plaedu.Types.Image },
            Cases: { type: $data.EntitySet, elementType: $plaedu.Types.Case },
            Pathologies: { type: $data.EntitySet, elementType: $plaedu.Types.Pathology },
            Experts: { type: $data.EntitySet, elementType: $plaedu.Types.Expert },
            Specialties: { type: $data.EntitySet, elementType: $plaedu.Types.Specialty },
            Countries: { type: $data.EntitySet, elementType: $plaedu.Types.Country },
            Users: { type: $data.EntitySet, elementType: $plaedu.Types.User },
            Contents: { type: $data.EntitySet, elementType: $plaedu.Types.Content },
            //AuthenticationResults: { type: $data.EntitySet, elementType: $plaedu.Types.AuthenticationResult }
        });
    },

    instantiateContexts: function () {

        var provider = WP8 ? 'indexedDb' : 'webSql';

        $plaedu.context = new $plaedu.Types.PlaeduContext({ name: provider, databaseName: "plaedu" });

        $plaedu.context.onReady(app.onLocalDBReady);

        $plaedu.context.remote = new $plaedu.Types.PlaeduContext({ name: "oData", oDataServiceHost: ODATA_SERVER });

        $plaedu.context.remote.onReady(function () {
        });
    },

    onLocalDBReady: function () {

        // Comprueba si existe un usuario autenticado en BD local. Si no existe, redirige a la vista de login.
        $plaedu.context.Users.toArray() // Este array tiene 0 o 1 elemento. El usuario logeado en la aplicación.
            .done(function (users) {
                if (users.length > 0) {
                    jQuery.support.cors = true;
                    $.ajax({
                        url: WEBAPI + "/AuthenticationResults/Authenticate" + "?email=" + users[0].Email + "&password=" + users[0].Password,
                        type: 'POST',
                        dataType: 'json',
                        success: function (data) {
                            if (data.AccountLocked) {
                                ShowMessage(data.Message);
                            } else if (data.Attempts > 0) {
                                ShowMessage(data.Message);
                            } else if (data.Authenticated === 1) {
                                if (data.User.Active) {
                                    loginVM.set("authenticationResult", "");
                                    loginVM.set("email", "");
                                    app.fillUserVM(data.User);
                                    app.kendoapp.replace("#home");
                                    $(".loadingSpinner").hide();
                                }
                                ShowMessage("Usuario Inactivo");
                            }
                        },
                        error: function () {
                        }
                    });
                }
            })
            .fail(function (error) {
                logError("Error al obtener los usuarios de BD local.", error);
            });

    },

    fillUserVM: function (user) {
        if (user) {
            userVM.userId = user.UserId;
            userVM.userTypeId = user.UserTypeId;
            userVM.selectedCountry = user.CountryId;
            userVM.firstName = user.FirstName;
            userVM.lastName = user.LastName;
            userVM.fullName = user.LastName + ", " + user.FirstName;
            userVM.email = user.Email;
            userVM.password = user.Password;
            userVM.active = user.Active;
        }
    },

    // Carga los datos estáticos desde la base de datos local (no va a buscarlos al servidor)
    fillViewModels: function () {
        var dPathologies = $plaedu.context.Pathologies.toArray();
        var dExperts = $plaedu.context.Experts.toArray();
        var dSpecialties = $plaedu.context.Specialties.toArray();
        var dCountries = $plaedu.context.Countries.toArray();

        //.filter(function (expert) { return expert.Active == true; }).toArray()

        return $.when(dPathologies, dExperts, dSpecialties, dCountries)
            .then(function (pathologies, experts, specialties, countries) {

                // Completa los datos en memoria con datos de BD local
                fillDropDownList(newcommentmailVM.pathologies, pathologies, false, false);
                fillDropDownList(newcommentmailVM.experts, experts, false, false);
                fillDropDownList(userVM.specialties, specialties, false, true);
                fillDropDownList(userVM.countries, countries, false, false);
                fillDropDownList(filtercasesVM.pathologies, pathologies, true, false);
                fillDropDownList(filtercasesVM.experts, experts, true, false);

                log("Datos est&aacute;ticos (Patologias, Expertos, Especialidades y Paises) cargados en memoria.");
            })
            .fail(function (error) {
                logError("Error al cargar datos desde BD local.", error);
            });
    },

    onOffline: function () {
        log("offline");
    },

    onOnline: function () {
        log("online");

        viewId = app.kendoapp.view().id;

        if (viewId != "#login" && viewId != "#newuser") {
            $plaedu.context.remote.Users
                .find(userVM.userId)
                .then(function (rUser) {
                    if (rUser.Active) {
                        if (viewId == "#home" || viewId == "/")
                            app.sync();
                    }
                    else {
                        app.clearUserVM();
                        app.kendoapp.navigate("#login");
                    }
                });
        }
    },

    resetLoadingMessage: function () {
        app.kendoapp.changeLoadingMessage("Loading...");
    },

    //-------------Fin App Initialization-------------

    //-------------Inicio Home-------------

    showHome: function (e) {

        if (!gConfigLoaded) {

            if (RIPPLE || navigator.connection.type != Connection.NONE) {
                app.loadConfig();
            }
            else {
                showModalMessage("Aviso", "No se pudieron cargar los datos de configuraci\u00f3n. \n Por favor revise su conexi\u00f3n a Internet. \n Gracias.");
            }
        }

        setTimeout(function () {
            if (!app.kendoapp)
                return;

            if (userVM.userId <= 0) {
                app.kendoapp.navigate("#login");
            }
            else {
                $("#userLoggedIn a").html(userVM.fullName);
            }
        });
    },

    //-------------Fin Home-------------

    //-------------Inicio Login-------------

    inFocus: function () {
        document.getElementsByClassName("nm-alert")[0].innerHTML = "";
        document.getElementById("loginResult").style.display = "none";
    },

    beforeShowLogin: function (e) {

        if (userVM.userId > 0) {
            e.preventDefault();
            app.kendoapp.replace("#home");
        }
        else {
            loginVM.validator = $("#loginForm").kendoValidator({
                rules: {
                    maxTextLength: function (input) {
                        if (input.is("[name=txtEmail]") || input.is("[name=txtPassword]")) {
                            var maxlength = input.attr("data-maxtextlength");
                            return input.val().replace(/<[^>]+>/g, "").length <= maxlength;
                        }
                        return true;
                    }
                }
            });
        }
    },

    // Envia las credenciales al servidor para autenticar al usuario. (Llamada desde menú)
    authenticateUser: function (e) {
        $plaedu.context.Users.forEach(function (item) {
            $plaedu.context.Users.remove(item);
        });
        $plaedu.context.saveChanges();

        var validator = loginVM.validator.data("kendoValidator");

        if (!validator.validate())
            return;
        if (e)
            e.preventDefault();

        $(".loadingSpinner").show();

        jQuery.support.cors = true;
        $.ajax({
            url: WEBAPI + "/AuthenticationResults/Authenticate" + "?email=" + loginVM.email + "&password=" + loginVM.password,
            type: 'POST',
            dataType: 'json',
            success: function (data) {
                if (data.AccountLocked) {
                    ShowMessage(data.Message);
                } else if (data.Attempts > 0) {
                    ShowMessage(data.Message);
                } else if (data.Authenticated === 1) {
                    if (data.User.Active) {
                        $plaedu.context.Users.add(data.User);
                        $plaedu.context.saveChanges()
                            .done(function () {
                                loginVM.set("authenticationResult", "");
                                loginVM.set("email", "");
                                app.fillUserVM(data.User);
                                app.kendoapp.replace("#home");
                            })
                            .fail(function (error) {
                                logError("Error grabando en el dispositivo el usuario autenticado.", error);
                            })
                            .always(function () {
                                $(".loadingSpinner").hide();
                            });
                    }

                    ShowMessage("Usuario Inactivo");
                }
                ShowMessage(data.Message);
                $(".loadingSpinner").hide();
            },
            error: function () {
            }
        });
    },

    showNewUser: function (e) {

        if (!gConfigLoaded) {

            if (RIPPLE || navigator.connection.type != Connection.NONE) {
                $(".loadingSpinner2nd").show();
                app.loadConfig()
                    .then(app.initializeNewUserForm)
                    .always(function () {
                        $(".loadingSpinner2nd").hide();
                    });
            }
            else {
                showModalMessage("Aviso", "No se pudieron cargar las especialidades y pa\u00edses. \n Por favor revise su conexi\u00f3n a Internet. \n Gracias.");
            }
        }
        else {
            app.initializeNewUserForm()
        }

        userVM.validator = $("#newUserForm").kendoValidator({
            rules: {
                maxTextLength: function (input) {
                    if (input.is("[name=txtEmailNU]") || input.is("[name=txtPasswordNU]") || input.is("[name=txtFirstNameNU]") || input.is("[name=txtLastNameNU]")) {
                        var maxlength = input.attr("data-maxtextlength");
                        return input.val().replace(/<[^>]+>/g, "").length <= maxlength;
                    }
                    return true;
                }
            }
        });
    },

    initializeNewUserForm: function () {

        app.clearUserVM();

        if (userVM.countries.length > 0)
            userVM.set("selectedCountry", userVM.countries[0].Id);

        if (userVM.specialties.length > 0)
            userVM.set("selectedSpecialty", userVM.specialties[0].Id);
    },

    createUser: function (e) {

        var validator = userVM.validator.data("kendoValidator");

        if (!validator.validate())
            return;

        e.preventDefault();

        userVM.fullName = userVM.lastName + ", " + userVM.firstName;

        var newUser = new $plaedu.Types.User({
            UserId: -1,
            UserTypeId: 1, // Médico
            FirstName: userVM.firstName,
            LastName: userVM.lastName,
            Email: userVM.email,
            Password: userVM.password,
            CountryId: userVM.selectedCountry,
            SpecialtyId: userVM.selectedSpecialty,
            Active: false
        });

        $plaedu.context.remote.Users.add(newUser);

        // Graba el usuario en el servidor
        $plaedu.context.remote.saveChanges()
            .done(function () {
                userVM.set("isCreateButtonEnabled", false);
                $("#createUserResult").toggleClass("result-success", true);
                $("#createUserResult").toggleClass("result-error", false);
                userVM.set("authenticationResult", "Registro correcto! Recibir\u00e1 un email con un link para finalizar el proceso de alta.");
            })
            .fail(function (error) {
                $plaedu.context.remote.stateManager.reset();
                $("#createUserResult").toggleClass("result-success", false);
                $("#createUserResult").toggleClass("result-error", true);
                userVM.set("authenticationResult", "Error al crear usuario. Revise los campos ingresados y la conexi\u00f3n a internet.");
                logError("Error al crear usuario", error);
            });
    },

    clearUserVM: function () {

        userVM.set("userId", -1);
        userVM.set("userTypeId", -1);
        userVM.set("firstName", "");
        userVM.set("lastName", "");
        userVM.set("fullName", "");
        userVM.set("email", "");
        userVM.set("password", "");
        userVM.set("selectedCountry", null);
        userVM.set("selectedSpecialty", null);
        userVM.set("active", false);
        userVM.set("authenticationResult", "");
        userVM.set("isCreateButtonEnabled", true);
    },

    logout: function () {

        if (gSynchronizing) {
            showModalMessage("Sincronizaci\u00f3n", "Sincronizaci\u00f3n en curso, por favor espere su finalizaci\u00f3n.");
        }
        else {
            $plaedu.context.Users.toArray()
                .then(function (users) {
                    users.forEach(function (user) { $plaedu.context.Users.remove(user); });
                    $plaedu.context.saveChanges()
                        .then(function () {
                            app.clearUserVM();
                            app.kendoapp.navigate("#login");
                        })
                        .fail(function (error) {
                            logError("Error grabando en el dispositivo el cierre de sesi\u00f3n.", error);
                        });
                })
                .fail(function (error) {
                    logError("Cerrar sesi\u00f3n. Error al obtener usuarios de BD local.", error);
                });
        }
    },


    //-------------Fin Login-------------


    //-------------Inicio Nuevo CommentMail (InMail)-------------
    beforeShowNewCommentMail: function (e) {
        if (!gConfigLoaded) {
            showModalMessage("Aviso", "Para crear un nuevo mensaje, se deben primero sincronizar los datos de configuraci\u00f3n.");
            log('No hay datos locales cargados a&uacute;n.');
            e.preventDefault();
        }
    },

    showNewCommentMail: function (e) {

        var caseUid = e.view.params.caseuid;
        var closeCase = false;

        if (e.view.params.closecase)
            closeCase = e.view.params.closecase;

        if (caseUid) {
            // Nuevo InMail de caso existente
            var relatedCase = casesVM.cases.get(caseUid);
            newcommentmailVM.set("caseEntity", relatedCase);
            newcommentmailVM.set("isFirstCommentMail", false);
            newcommentmailVM.set("selectedPathology", relatedCase.PathologyId);
            newcommentmailVM.set("selectedExpert", relatedCase.ExpertUserId);
            newcommentmailVM.set("subject", relatedCase.Title);
            newcommentmailVM.set("closeCase", closeCase);
        }
        else {
            // Primer InMail del caso
            newcommentmailVM.set("caseEntity", null);
            newcommentmailVM.set("isFirstCommentMail", true);
            newcommentmailVM.set("selectedPathology", newcommentmailVM.pathologies[0].Id);
            newcommentmailVM.set("selectedExpert", newcommentmailVM.experts[0].Id);
            newcommentmailVM.set("subject", "");
            newcommentmailVM.set("closeCase", false);
        }

        var queryanswerTemplate = kendo.template($("#queryanswer-template").html());
        var queryanswerHtml = queryanswerTemplate(userVM);
        $("#queryAnswer").html(queryanswerHtml);
        newcommentmailVM.set("text", "");
        $("#attachedImages").html("");

        kendo.bind(e.view.element, newcommentmailVM, kendo.mobile.ui);

        newcommentmailVM.validator = $("#newCommentMailForm").kendoValidator({
            rules: {
                maxTextLength: function (input) {
                    if (input.is("[name=txtSubject]")) {
                        var maxlength = input.attr("data-maxtextlength");
                        return input.val().replace(/<[^>]+>/g, "").length <= maxlength;
                    }
                    return true;
                }
            }
        });

    },

    attachImage: function () {

        var imageCount = $("#attachedImages").children().length;

        if (imageCount >= 5) {
            showModalMessage("", "No se pueden adjuntar m\u00e1s de 5 im\u00e1genes");
            return;
        }

        if (RIPPLE) {
            app.onGetPictureSuccess("img/icons/home.png");
            return;
        }

        navigator.camera.getPicture(app.onGetPictureSuccess, app.onGetPictureFail, {
            quality: 40,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            allowEdit: false,
            mediaType: Camera.MediaType.PICTURE
        });

    },

    onGetPictureSuccess: function (imageURI) {

        var imgRow = "<div class='imgRow'><img class='commentMailImg' width='200' src='" + imageURI + "' /><button class='km-button' type='button' value='delete'>Borrar</button></div>";

        $("#attachedImages").append(imgRow);
    },

    onGetPictureFail: function (message) {
        logError("Falla obteniendo imagen.", message);
    },

    deleteImage: function (button) {

        var cmd = button.val();
        switch (cmd) {
            case "delete":
                button.parent(".imgRow").remove();
                app.kendoapp.scroller().scrollTo(0, 0);
                break;
        }
    },

    // Guarda el inMail en el dispositivo y luego envía lo pendiente al servidor.
    saveCommentMailToLocalDB: function () {

        var validator = newcommentmailVM.validator.data("kendoValidator");

        newcommentmailVM.validator = $("#newCommentMailForm").kendoValidator({
            rules: {
                minTextLength: function (input) {
                    if (input.is("[name=txaText]")) {
                        var minlength = input.attr("data-mintextlength");
                        return $.trim(input.val()) != "";
                    }
                    return true;
                }
            }
        });

        if (!validator.validate())
            return;


        if (gSynchronizing) {
            showModalMessage("Sincronizaci\u00f3n", "Sincronizaci\u00f3n en curso, por favor espere su finalizaci\u00f3n.");
        }
        else {

            log('Grabando nuevo mensaje...');

            if (newcommentmailVM.caseEntity) {
                // El mensaje pertenece a un caso existente. El objeto caseEntity apunta directamente a la instancia de la tabla.
                newcommentmailVM.caseEntity = $plaedu.context.Cases.attachOrGet(newcommentmailVM.caseEntity);

                if (userVM.userTypeId == UserTypes.Doctor) {
                    newcommentmailVM.caseEntity.CaseStateId = CaseStates.MsgUsrPending;
                }
                else { // Experto
                    newcommentmailVM.caseEntity.CaseStateId = newcommentmailVM.closeCase ? CaseStates.MsgExpClose : CaseStates.MsgExp;
                }
            }
            else {
                // Crea un nuevo caso y lo asigna a newcommentmailVM.caseEntity
                var currentCase = new $plaedu.Types.Case({
                    CaseUid: $data.createGuid(),
                    Title: newcommentmailVM.subject,
                    ExpertUserId: newcommentmailVM.selectedExpert,
                    CaseStateId: CaseStates.MsgUsrPendingFQ,
                    PathologyId: newcommentmailVM.selectedPathology,
                    UserId: userVM.userId
                });
                $plaedu.context.Cases.add(currentCase);
                newcommentmailVM.caseEntity = currentCase;
            }

            var now = new Date(); // Esta variable es tenida en cuenta para almacenamiento local. En BD remota tanto Comment.DateTime como Comment.LastUpdate se asignan a una hora UTC via stored procedure.
            newcommentmailVM.caseEntity.LastChangeDateTime = now;
            newcommentmailVM.caseEntity.Sync = false;

            var toUserId = (userVM.userTypeId == UserTypes.Doctor) ? newcommentmailVM.selectedExpert : newcommentmailVM.caseEntity.UserId;

            newcommentmailVM.commentMailEntity = new $plaedu.Types.CommentMail({
                CommentUid: $data.createGuid(),
                CaseUid: newcommentmailVM.caseEntity.CaseUid,
                ToUserId: toUserId,
                Subject: newcommentmailVM.subject,
                UserId: userVM.userId,
                UserFullName: userVM.fullName,
                Text: newcommentmailVM.text,
                DateTime: now,
                Sync: false
            });

            $plaedu.context.CommentMails.add(newcommentmailVM.commentMailEntity);

            app.saveImagesToLocalDB();
        }
    },

    saveImagesToLocalDB: function () {

        log('Grabando im&aacute;genes locales...');

        newcommentmailVM.commentMailEntity.ImageCount = 0;

        $(".commentMailImg").each(function (index, img) {

            var newImage = new $plaedu.Types.Image(
            {
                ImageUid: $data.createGuid(),
                CommentUid: newcommentmailVM.commentMailEntity.CommentUid,
                FileName: img.src.substr(img.src.lastIndexOf('/') + 1),
                ImageURI: img.src,
                UserId: userVM.userId,
                Sync: false,
                Uploaded: false
            });

            //alert("newImage.ImageUid: " + newImage.ImageUid);
            $plaedu.context.Images.add(newImage);
            newcommentmailVM.commentMailEntity.ImageCount++;
        });

        // Graba en BD local (Caso, mensaje e imágenes si corresponde)
        return $plaedu.context.saveChanges()
            .fail(function (error) {
                logError("Error grabando en el dispositivo los casos, mensajes e im\u00e1genes.", error);
            })
            .then(function () {
                showToast("Enviando mensaje...", false);
                return app.syncToServer();
            })
            .done(function () {
                changeToastMessage("Mensaje enviado.");
                app.sendImages();
            })
            .fail(function (error) {
                //logError("Error sincronizando casos, mensajes e imagenes.", error);
                //showModalMessage("Error", "Ocurri\u00f3 un error en el env\u00edo del mensaje. \n Por favor intente nuevamente m\u00e1s tarde. \n Gracias.");
            })
            .always(function () {
                hideToast();
                app.loadMyCasesInCasesVM();
                casesVM.myCases = true;
                app.kendoapp.replace("#casedetail?caseUid=" + newcommentmailVM.caseEntity.CaseUid);
            });
    },

    // Envia las imágenes al servidor
    sendImages: function () {

        $plaedu.context.Images
            .filter(function (img) { return img.Uploaded == false; }, {})
            .forEach(function (attachedImage) {

                if (RIPPLE) {
                    $plaedu.context.Images.attachOrGet(attachedImage);
                    attachedImage.Uploaded = true;
                    $plaedu.context.Images.saveChanges();
                    return;
                }

                var options = new FileUploadOptions();

                options.fileKey = "newCommentMailForm";
                options.fileName = attachedImage.FileName;
                options.mimeType = "image/jpeg";
                options.chunkedMode = true;

                var params = {};
                params.imageUid = attachedImage.ImageUid;

                options.params = params;

                if (WP8) {
                    attachedImage.ImageURI = attachedImage.ImageURI.replace("x-wmapp0:/.", "");
                    //options.chunkedMode = false;
                    //options.headers = {
                    //    Connection: "close"
                    //}
                }

                log("Enviando imagen: " + attachedImage.ImageURI);
                var fileTransfer = new FileTransfer();
                log(WEBAPI_SERVER + "/api/Upload");

                fileTransfer.upload(
                    attachedImage.ImageURI,
                    encodeURI(WEBAPI_SERVER + "/api/Upload"),
                    function (fileUploadResult) {
                        app.onSendImageSuccess(fileUploadResult, attachedImage);
                        showToast("Exito", false);
                    },
                    app.onSendImageFail,
                    options,
                    true); // TODO: trustAllHosts: Optional parameter, defaults to false. En produccción debe estar en false.
            });
    },

    onSendImageSuccess: function (fileUploadResult, attachedImage) {

        // Marca la imagen como subida en BD local
        $plaedu.context.Images.attachOrGet(attachedImage);
        attachedImage.Uploaded = true;
        //log("attachedImage.ImageUid: " + attachedImage.ImageUid);

        $plaedu.context.Images.saveChanges()
            .done(function () {
                log("Imagen enviada: " + attachedImage.ImageURI);
            })
            .fail(function (error) {
                logError("Error al guardar la sincronizacion de la imagen en el dispositivo local.", error);
            });

    },

    onSendImageFail: function (fileTransferError) {
        showToast("Error", false);
        showToast(fileTransferError.code, false);
        showToast(fileTransferError.source, false);
        showToast(fileTransferError.target, false);
        showToast("Error", false);
        showToast(fileTransferError.code, false);
        log("Error enviando la imagen al servidor");
        log("Code = " + fileTransferError.code);
        log("Source = " + fileTransferError.source);
        log("Target = " + fileTransferError.target);
    },

    //-------------Fin Nuevo CommentMail-------------

    //-------------Inicio Casos (Mis casos y Repositorio)-------------

    beforeShowFilterCases: function (e) {
        if (!gConfigLoaded) {
            showModalMessage("Aviso", "Para filtrar los casos, se deben primero sincronizar los datos de configuraci\u00f3n.");
            log('No hay datos locales cargados a&uacute;n.');
            e.preventDefault();
        }

        filtercasesVM.validator = $("#filterCasesForm").kendoValidator({
            rules: {
                maxTextLength: function (input) {
                    if (input.is("[name=txtFreeSearch]")) {
                        var maxlength = input.attr("data-maxtextlength");
                        return input.val().replace(/<[^>]+>/g, "").length <= maxlength;
                    }
                    return true;
                }
            }
        });
    },

    filterCases: function () {

        var validator = filtercasesVM.validator.data("kendoValidator");

        if (!validator.validate())
            return;

        var casesUrl = "#cases?pathologyId=" + filtercasesVM.selectedPathology
                        + "&expertUserId=" + filtercasesVM.selectedExpert
                        + "&text=" + encodeURIComponent(filtercasesVM.freeSearchText);

        app.kendoapp.navigate(casesUrl);
    },

    setContentsVisibility: function (contentSelector, visible) {
        var contentDiv = $(contentSelector + " div[data-role='content']");
        contentDiv.css('visibility', visible ? 'visible' : 'hidden');
    },

    beforeShowCases: function (e) {
        app.setContentsVisibility("#cases", false);
    },

    showCases: function (e) {
        casesVM.myCases = (e.view.params.mycases == "true");

        if (casesVM.myCases) {
            // Mis Casos
            app.loadMyCasesInCasesVM();
        }
        else {

            // Repositorio de casos
            var pathologyId = e.view.params.pathologyId;
            var expertUserId = e.view.params.expertUserId;
            var text = e.view.params.text;

            casesVM.cases = $plaedu.context.remote.Cases
                                .filter(function (rCase) {
                                    return rCase.PathologyId == this.pathologyId
                                           && rCase.ExpertUserId == this.expertUserId
                                           && rCase.Title == encodeURIComponent(this.text)
                                           && rCase.UserId == this.userId; // El usuario se usa para obtener el pais y traer solo los casos de ese pais
                                }, { pathologyId: pathologyId, expertUserId: expertUserId, text: text, userId: userVM.userId })
                                .asKendoDataSource({ pageSize: 1000 });
        }

        var lvCases = $("#lvCases").data('kendoMobileListView');
        lvCases.setDataSource(casesVM.cases);

        app.kendoapp.scroller().scrollTo(0, 0);
    },

    loadMyCasesInCasesVM: function () {

        casesVM.cases = $plaedu.context.Cases
            .filter(function (mycase) {
                return mycase.UserId == this.userId || (mycase.ExpertUserId == this.userId && mycase.CaseStateId != CaseStates.None && mycase.CaseStateId != CaseStates.MsgUsrPendingFQ && mycase.CaseStateId != CaseStates.MsgUsrPending);
            }, { userId: userVM.userId })
            .orderByDescending("it.LastChangeDateTime")
            .asKendoDataSource({ pageSize: 1000 });
    },

    lvCasesBound: function (e) {

        app.setContentsVisibility("#cases", true);

        // this es lvCases (kendoMobileListView)
        if (this.dataSource.data().length == 0) {
            $("#lvCases").append("<h3>No se encontraron casos.</h3>");
        }
    },

    onCaseClick: function (e) {

        if (gSynchronizing)
            showModalMessage("Sincronizaci\u00f3n", "Sincronizaci\u00f3n en curso, por favor espere su finalizaci\u00f3n.");
        else
            app.kendoapp.navigate("#casedetail?caseUid=" + e.dataItem.CaseUid);
    },

    beforeShowCaseDetail: function (e) {
        app.setContentsVisibility("#casedetail", false);
    },

    showCaseDetail: function (e) {

        casesVM.cases.fetch(function () {

            // Obtiene el caso a mostrar
            caseVM.caseEntity = casesVM.cases.get(e.view.params.caseUid);

            // Carga la patología y el experto en caseVM para poder mostrar sus descripciones
            var dPathologies = $plaedu.context.Pathologies.filter("it.Id == pathologyId", { pathologyId: caseVM.caseEntity.PathologyId }).toArray();
            var dExperts = $plaedu.context.Experts.filter("it.Id == expertUserId", { expertUserId: caseVM.caseEntity.ExpertUserId }).toArray();

            $.when(dPathologies, dExperts)
                .done(function (pathologyArray, expertArray) {

                    if (pathologyArray.length > 0)
                        caseVM.Pathology = pathologyArray[0];

                    if (expertArray.length > 0)
                        caseVM.Expert = expertArray[0];

                    // Enlaza la vista con el ViewModel
                    kendo.bind(e.view.element, caseVM, kendo.mobile.ui);

                    $("#caseDetailActions").html("");

                    var caseStateId = caseVM.caseEntity.CaseStateId;

                    if (casesVM.myCases) {

                        if (userVM.userTypeId == UserTypes.Doctor) {

                            if (caseStateId == CaseStates.MsgExp
                                || caseStateId == CaseStates.MsgExpClose) {

                                var answerButtonTemplate = kendo.template($("#answerbutton-template").html());
                                var answerButtonHtml = answerButtonTemplate(caseVM);
                                $("#caseDetailActions").append(answerButtonHtml);
                                $("#btnAnswerCommentMail").kendoMobileButton({ click: app.onAnswerCommentMail });
                            }

                            // Si hay solicitud de cierre, se agrega el botón "Cerrar caso"
                            if (caseStateId == CaseStates.MsgExpClose) {

                                var closeCaseButtonTemplate = kendo.template($("#closecasebutton-template").html());
                                var closeCaseButtonHtml = closeCaseButtonTemplate(caseVM);
                                $("#caseDetailActions").append(closeCaseButtonHtml);
                                $("#btnCloseCase").kendoMobileButton({ click: app.onCloseCase });
                            }
                        }
                        else { // Experto

                            if (caseStateId == CaseStates.MsgUsrFQ
                                || caseStateId == CaseStates.MsgUsr) {

                                // Agrega el botón "Solicitar información"
                                var moreinfoButtonTemplate = kendo.template($("#moreinfobutton-template").html());
                                var moreinfoButtonHtml = moreinfoButtonTemplate(caseVM);
                                $("#caseDetailActions").append(moreinfoButtonHtml);
                                $("#btnMoreInfo").kendoMobileButton({ click: app.onAnswerCommentMail });

                                // Habilita el botón "Responder y Cerrar"
                                var askCloseCaseButtonTemplate = kendo.template($("#askclosecasebutton-template").html());
                                var askCloseCaseButtonHtml = askCloseCaseButtonTemplate(caseVM);
                                $("#caseDetailActions").append(askCloseCaseButtonHtml);
                                $("#btnAskCloseCase").kendoMobileButton({ click: app.onAskCloseCase });
                            }

                            // Habilita el botón "Confirmar cierre"
                            if (caseStateId == CaseStates.ClosePending) {

                                var confirmCloseCaseButtonTemplate = kendo.template($("#confirmclosecasebutton-template").html());
                                var confirmCloseCaseButtonHtml = confirmCloseCaseButtonTemplate(caseVM);
                                $("#caseDetailActions").append(confirmCloseCaseButtonHtml);
                                $("#btnConfirmCloseCase").kendoMobileButton({ click: app.openConfirmCloseCaseView });
                                confirmCloseCaseVM.caseTitle = caseVM.caseEntity.Title;
                                confirmCloseCaseVM.finalComment = "";
                            }
                        }
                    }
                });
        });
    },

    lvCaseCommentMailsBound: function (e) {
        app.setContentsVisibility("#casedetail", true);
        app.scrollToBottom();
    },

    toggleCommentMailImages: function (e) {

        var commentUid = e.button.data().commentuid;
        var imagesDiv = $("#commentMailImageBox" + commentUid);

        imagesDiv.toggle();

        if (imagesDiv.is(":visible")) {
            app.showCommentMailImages(commentUid);
            e.button.text("Ocultar im\u00e1genes");
        }
        else {
            imagesDiv.html("");
            e.button.text("Ver im\u00e1genes");
        }
    },

    showCommentMailImages: function (commentUid) {
        var imageDataSource = caseVM.getCommentMailImages(commentUid);

        imageDataSource.fetch(function () {

            var data = imageDataSource.data();

            var showDownloadMessage = true;

            data.forEach(function (imageObservable) {

                imageEntity = imageObservable.innerInstance();

                var imageTemplate = kendo.template($("#commentmailimage-template").html());
                var imagesDiv = $("#commentMailImageBox" + commentUid);


                log("imageUri" + imageEntity.ImageURI);
                imageEntity.ImageURI = "";
                if (!imageEntity.ImageURI) {

                    log("Descargando imagenes");

                    if (!RIPPLE) {

                        if (showDownloadMessage) {
                            showToast("Descargando im\u00e1genes", false);
                            showDownloadMessage = false;
                        }

                        app.prepareDownloadImage(imageEntity, imageTemplate, imagesDiv);
                    }

                }
                else {
                    var result = imageTemplate(imageEntity);
                    imagesDiv.append(result);
                }
            });
        });
    },

    prepareDownloadImage: function (imageEntity, imageTemplate, imagesDiv) {
        var lfsTypeStr;
        var lfsType;

        if (casesVM.myCases) {
            lfsTypeStr = "persistent";
            lfsType = LocalFileSystem.PERSISTENT;
        }
        else {
            lfsTypeStr = "temporary";
            lfsType = LocalFileSystem.TEMPORARY;
        }

        if (!WP8) {
            log("entró para bajar las imagenes");
            var fileURL = "cdvfile://localhost/" + lfsTypeStr + "/" + imageEntity.FileName + "_" + imageEntity.ImageUid;
            app.downloadImage(imageEntity, imageTemplate, imagesDiv, fileURL);
        }
        else {
            window.requestFileSystem(lfsType, 0, function (fs) {
                fs.root.getDirectory("plaedu", {
                    create: true,
                    exclusive: false
                }, function (directory) {
                    var fileURL = directory.toURL() + "/" + imageEntity.FileName + "_" + imageEntity.ImageUid;
                    app.downloadImage(imageEntity, imageTemplate, imagesDiv, fileURL);
                })
            }, function (error) {
                hideToast();
                console.log("requestFileSystem error code: " + error.code);
                console.log("requestFileSystem error source: " + error.source);
                console.log("requestFileSystem error target: " + error.target);
            });
        }

    },

    downloadImage: function (imageEntity, imageTemplate, imagesDiv, fileURL) {

        var uri = IMG_DOWNLOAD_SERVER + "/downloads/download?uid=" + imageEntity.ImageUid;

        log("fileURL: " + encodeURI(fileURL));

        var fileTransfer = new FileTransfer();

        fileTransfer.download(
            encodeURI(uri),
            encodeURI(fileURL),
            function (entry) {
                // Download Success!
                hideToast();

                if (casesVM.myCases) {
                    // Actualiza BD local
                    $plaedu.context.Images.attach(imageEntity);
                    imageEntity.ImageURI = entry.toURL();
                    $plaedu.context.Images.saveChanges()
                        .fail(function (error) {
                            logError("Error al actualizar la ruta del archivo bajado en el dispositivo local.", error);
                        });
                }

                // Agrega la imagen a la vista
                log("entry.toURL(): " + entry.toURL());
                imageEntity.ImageURI = entry.toURL();
                var result = imageTemplate(imageEntity);
                imagesDiv.append(result);
            },
            function (error) {
                // Download Error
                hideToast();
                log("download error source: " + error.source);
                log("download error target: " + error.target);
                log("download error code: " + error.code);
            },
            true); // TODO: trustAllHosts = true not recommended for production use. Supported on Android and iOS.
    },

    onAnswerCommentMail: function (e) {

        var caseUid = e.button.data().caseuid;

        app.kendoapp.navigate("#newcommentmail?caseuid=" + caseUid);
    },

    onCloseCase: function (e) {

        var caseUid = e.button.data().caseuid;

        $plaedu.context.Cases
            .filter("it.CaseUid == caseUid", { caseUid: caseUid })
            .forEach(function (myCase) {

                $plaedu.context.Cases.attach(myCase);
                myCase.CaseStateId = CaseStates.ClosePending;

                $plaedu.context.Cases.saveChanges()
                    .then(function () {

                        $plaedu.context.remote.Cases
                            .find(caseUid)
                            .then(function (rMyCase) {

                                $plaedu.context.remote.Cases.attach(rMyCase);
                                rMyCase.CaseStateId = CaseStates.ClosePending;

                                $plaedu.context.remote.Cases.saveChanges()
                                    .then(function () {
                                        $("#btnAnswerCommentMail").hide();
                                        $("#btnCloseCase").hide();
                                    })
                                    .fail(function (error) {
                                        showModalMessage("Error", "Ocurri\u00f3 un error al cambiar el estado del caso. \n Por favor intente nuevamente mas tarde. Gracias.");
                                        logError("Error guardando estado ClosePending en el servidor.", error);
                                    });

                            });
                    })
                    .fail(function (error) {
                        logError("Error guardando estado ClosePending en BD local.", error);
                    });

            });
    },

    onAskCloseCase: function (e) {

        var caseUid = e.button.data().caseuid;

        app.kendoapp.navigate("#newcommentmail?caseuid=" + caseUid + "&closecase=true");
    },

    openConfirmCloseCaseView: function (e) {

        var caseUid = e.button.data().caseuid;

        app.kendoapp.navigate("#confirmCloseCase?caseuid=" + caseUid);
    },

    showConfirmCloseCase: function (e) {

        // Se asigna el caseuid al botón con id btnConfirmCloseCase2 de manera dinámica
        $("#btnConfirmCloseCase2").data("caseuid", e.view.params.caseuid);

        confirmCloseCaseVM.validator = $("#confirmCloseCaseForm").kendoValidator({
            rules: {
                maxTextLength: function (input) {
                    if (input.is("[name=txtCaseTitle]")) {
                        var maxlength = input.attr("data-maxtextlength");
                        return input.val().replace(/<[^>]+>/g, "").length <= maxlength;
                    }
                    return true;
                }
            }
        });
    },

    onConfirmCloseCase: function (e) {

        var validator = confirmCloseCaseVM.validator.data("kendoValidator");

        if (!validator.validate())
            return;

        var caseUid = e.button.data().caseuid;

        $plaedu.context.Cases
            .filter("it.CaseUid == caseUid", { caseUid: caseUid })
            .forEach(function (myCase) {

                $plaedu.context.Cases.attach(myCase);
                myCase.CaseStateId = CaseStates.Closed;

                if (confirmCloseCaseVM.caseTitle)
                    myCase.Title = confirmCloseCaseVM.caseTitle;

                if (confirmCloseCaseVM.finalComment) {

                    // Comentario final enviado como InMail
                    var commentMailEntity = new $plaedu.Types.CommentMail({
                        CommentUid: $data.createGuid(),
                        CaseUid: myCase.CaseUid,
                        ToUserId: myCase.UserId,
                        Subject: myCase.Title,
                        UserId: userVM.userId,
                        UserFullName: userVM.fullName,
                        Text: confirmCloseCaseVM.finalComment,
                        DateTime: new Date(),
                        Sync: false
                    });

                    $plaedu.context.CommentMails.add(commentMailEntity);
                }

                $plaedu.context.saveChanges()
                    .then(function () {

                        $plaedu.context.remote.Cases
                            .find(caseUid)
                            .then(function (rMyCase) {

                                $plaedu.context.remote.Cases.attach(rMyCase);
                                rMyCase.CaseStateId = CaseStates.Closed;

                                if (confirmCloseCaseVM.caseTitle)
                                    rMyCase.Title = confirmCloseCaseVM.caseTitle;

                                if (confirmCloseCaseVM.finalComment)
                                    $plaedu.context.remote.CommentMails.add(commentMailEntity);

                                $plaedu.context.remote.saveChanges()
                                    .then(function () {
                                        if (confirmCloseCaseVM.finalComment) {

                                            $plaedu.context.CommentMails.attach(commentMailEntity);
                                            commentMailEntity.Sync = true;
                                            $plaedu.context.saveChanges()
                                                .then(function () {
                                                    app.kendoapp.navigate("#cases?mycases=true");
                                                    showToast("Caso Cerrado", true);
                                                })
                                                .fail(function (error) {
                                                    logError("Error estableciendo el comentario final como sincronizado.", error);
                                                });
                                        }
                                        else {
                                            app.kendoapp.navigate("#cases?mycases=true");
                                            showToast("Caso Cerrado", true);
                                        }

                                    })
                                    .fail(function (error) {
                                        showModalMessage("Error", "Ocurri\u00f3 un error al cambiar el estado del caso. \n Por favor intente nuevamente mas tarde. Gracias.");
                                        logError("Error guardando estado Closed en el servidor.", error);
                                    });
                            });
                    })
                    .fail(function (error) {
                        logError("Error guardando estado Closed en BD local.", error);
                    });

            });

    },

    //-------------Fin Casos (Mis casos y Repositorio)-------------

    //-------------Inicio Sincronizacion-------------

    sync: function () {

        if (!RIPPLE && navigator.connection.type == Connection.NONE) {
            showModalMessage("Aviso", "Por favor, revise su conexi\u00f3n a Internet.");
            return;
        }

        if (gSynchronizing)
            return;

        gSynchronizing = true;

        $(".loadingSpinner").show();

        app.syncToServer()
            .then(function () {
                return app.syncFromServer();
            })
            .done(function () {
                log("antes de send images");
                app.sendImages();
            })
            .fail(function (error) {
                logError("Error al sincronizar desde el servidor.", error);
            })
            .always(function myfunction() {
                gSynchronizing = false;
                $(".loadingSpinner").hide();
            });
    },

    syncToServer: function () {

        log("Actualizando BD remota...");

        var pendingCases = $plaedu.context.Cases.filter('it.Sync == false').toArray();
        var pendingCommentMails = $plaedu.context.CommentMails.filter('it.Sync == false').toArray();
        var pendingImages = $plaedu.context.Images.filter('it.Sync == false').toArray();
        log("Filtros aceptados");

        return $.when(pendingCases, pendingCommentMails, pendingImages)
            .fail(function (error) {
                logError("Error obteniendo datos para sincronizar.", error);
            })
            .then(function (pendingCasesArray, pendingCommentMailsArray, pendingImagesArray) {
                $plaedu.context.remote.Cases.addMany(pendingCasesArray);
                log("Casos Addmany...");
                $plaedu.context.remote.CommentMails.addMany(pendingCommentMailsArray);
                log("Comentarios Addmany...");
                //$plaedu.context.remote.Images.addMany(pendingImagesArray);
                //log("imagesnes Addmany.......");
                return $plaedu.context.remote.saveChanges()
                    .fail(function (error) {
                        showModalMessage("Error", "Ocurri\u00f3 un error en la sincronizaci\u00f3n. \n Por favor intente nuevamente mas tarde. Gracias.");
                        logError("Error al sincronizar hacia el servidor.", error);
                        log(error);
                    });
            })
            .then(function () {
                log("BD remota actualizada.");
                return app.setLocalEntitiesSync();
            });
    },

    setLocalEntitiesSync: function () {

        var pendingCases = $plaedu.context.Cases.filter('it.Sync == false').toArray();
        var pendingCommentMails = $plaedu.context.CommentMails.filter('it.Sync == false').toArray();
        var pendingImages = $plaedu.context.Images.filter('it.Sync == false').toArray();

        return $.when(pendingCases, pendingCommentMails, pendingImages)
            .then(function (pendingCasesArray, pendingCommentMailsArray, pendingImagesArray) {

                pendingCasesArray.forEach(function (pendingCase) {
                    $plaedu.context.Cases.attach(pendingCase);
                    pendingCase.Sync = true;
                });

                pendingCommentMailsArray.forEach(function (pendingCommentMail) {
                    $plaedu.context.CommentMails.attach(pendingCommentMail);
                    pendingCommentMail.Sync = true;
                });

                pendingImagesArray.forEach(function (pendingImage) {
                    $plaedu.context.Images.attach(pendingImage);
                    pendingImage.Sync = true;
                });

                return $plaedu.context.saveChanges()
                    .fail(function (error) {
                        logError("Error estableciendo las entidades locales como sincronizadas.", error);
                    });
            });
    },

    syncFromServer: function () {

        log("Actualizando BD local...");

        return app.loadConfig()
            .then(function () {
                return app.syncMyCasesFromServer()
                    .then(function () {
                        return $plaedu.context.saveChanges()
                            .then(function () {
                                log("BD local actualizada.");
                            });
                    });
            })
            .fail(function (error) {
                logError("Error al obtener y guardar tablas desde el servidor.", error);
            });
    },

    loadConfig: function () {

        return app.syncConfigFromServer()
            .then(function () {
                return $plaedu.context.saveChanges()
                    .then(function () {
                        return app.fillViewModels()
                            .then(function () {
                                gConfigLoaded = true;
                            });
                    })
                    .fail(function (error) {
                        logError("Error guardar datos de configuraci\u00f3n en BD local.", error);
                    });
            })
            .fail(function (error) {
                showModalMessage("Error", "Error al cargar los datos de configuraci\u00f3n. \n Por favor revise su conexi\u00f3n a Internet. \n Gracias.");
                logError("Error cargando datos de configuraci\u00f3n desde el servidor", error);
            });
    },

    syncConfigFromServer: function () {

        return $.when(
            app.emptyTable($plaedu.context.Pathologies),
            app.emptyTable($plaedu.context.Experts),
            app.emptyTable($plaedu.context.Specialties),
            app.emptyTable($plaedu.context.Countries))
        .then(function () {
            return $plaedu.context.saveChanges();
        })
        .then(function () {
            var dPathologies = app.copyTable($plaedu.context.remote.Pathologies, $plaedu.context.Pathologies);
            var dExperts = app.copyTable($plaedu.context.remote.Experts, $plaedu.context.Experts);
            var dSpecialties = app.copyTable($plaedu.context.remote.Specialties, $plaedu.context.Specialties);
            var dCountries = app.copyTable($plaedu.context.remote.Countries, $plaedu.context.Countries);

            return $.when(dPathologies, dExperts, dSpecialties, dCountries);
        });
    },

    emptyTable: function (localTable) {
        return localTable.forEach(function (item) {
            localTable.remove(item);
        });
    },

    copyTable: function (serverTable, localTable) {
        return serverTable.toArray()
            .then(function (rTableArray) {
                localTable.addMany(rTableArray);
                return localTable;
            });
    },

    syncMyCasesFromServer: function () {

        // Se borran los Casos y Mensajes locales sincronizados y se agregan los del servidor, porque el attach() no funcionaba.
        return $plaedu.context.Cases.filter('it.Sync == true')
            .forEach(function (mycase) { $plaedu.context.Cases.remove(mycase); })
            .then(function () {
                return $plaedu.context.CommentMails.filter('it.Sync == true')
                    .forEach(function (mycommentmail) { $plaedu.context.CommentMails.remove(mycommentmail); });
            })
            .then(function () {
                return $plaedu.context.saveChanges();
            })
            .then(function () {
                return $plaedu.context.remote.Cases
                    .filter("it.UserId == userId && it.UserTypeId == userTypeId", { userId: userVM.userId, userTypeId: userVM.userTypeId })
                   .forEach(function (rMyCase) {
                       rMyCase.Sync = true;
                       $plaedu.context.Cases.add(rMyCase);
                   });
            })
            .then(function () {
                return $plaedu.context.remote.CommentMails
                    .filter("it.UserId == userId", { userId: userVM.userId })
                    .forEach(function (rMyCommentMail) {
                        rMyCommentMail.Sync = true;
                        $plaedu.context.CommentMails.add(rMyCommentMail);
                    });
            })
            .then(function () {
                return $plaedu.context.remote.Images
                    .filter("it.UserId == userId", { userId: userVM.userId })
                    .toArray()
                    .then(function (rMyImages) {
                        var lengthArray = [];
                        rMyImages.forEach(function (rMyImage) {
                            lengthArray.push($plaedu.context.Images
                                .filter("it.ImageUid == imageUid", { imageUid: rMyImage.ImageUid })
                                .length(function (imageCount) {
                                    // En el caso de las imágenes, sólo se agregan los registros nuevos para no perder las rutas locales.
                                    if (imageCount == 0) {
                                        rMyImage.Sync = true;
                                        rMyImage.Uploaded = true;
                                        $plaedu.context.Images.add(rMyImage);
                                        //alert("rMyImage.ImageUid: " + rMyImage.ImageUid);
                                    }
                                }));
                        });
                        return $.when.apply($, lengthArray);
                    });
            });
    },

    //-------------Fin Sincronizacion-------------

    //-------------Inicio Contenido-------------

    beforeShowContents: function (e) {

        if (!RIPPLE && navigator.connection.type == Connection.NONE) {
            showModalMessage("Aviso", "Por favor, revise su conexi\u00f3n a Internet.");
            e.preventDefault();
        }
    },

    showContents: function (e) {

        //Archivo PDF -> ContentTypeId = 3
        //Aplicación -> ContentTypeId = 4
        //Link externo -> ContentTypeId = 5
        var contentTypeId = e.view.params.contenttypeId;
        log("ContentType: " + contentTypeId);
        $("#txtContentTypeId").val(e.view.params.contenttypeId);

        if (contentTypeId) {

            contentsVM.contents = $plaedu.context.remote.Contents
                        .filter(function (content) {
                            return content.ContentTypeId == this.contentTypeId && content.UserId == this.userId;
                        }, { contentTypeId: contentTypeId, userId: userVM.userId })
                        .orderBy("it.Title")
                        .asKendoDataSource();

            lvContents = $("#lvContents").data('kendoMobileListView');
            lvContents.setDataSource(contentsVM.contents);
        }
    },

    aftershowContents: function (e) {

        var contentTypeId = e.view.params.contenttypeId;

        if (contentTypeId) {

            // Asigna el titulo a la NavBar (navigation bar) de la vista
            var navbar = e.view.header.find(".km-navbar").data("kendoMobileNavBar");

            switch (contentTypeId) {
                case "3":
                    navbar.title("Descargas (pdf)");
                    break;
                case "4":
                    navbar.title("Aplicaciones recomendadas");
                    break;
                case "5":
                    navbar.title("Info Adicional");
                    break;
            }
        }
    },

    onContentClick: function (e) {
        app.kendoapp.navigate("#contentdetail?contentid=" + e.dataItem.ContentId);
    },

    showContentDetail: function (e) {
        var contentVM = contentsVM.contents.get(e.view.params.contentid);

        contentVM.FormattedDateTime = kendo.toString(contentVM.PublishDateTime, "g");

        // Enlaza la vista con el ViewModel
        kendo.bind(e.view.element, contentVM, kendo.mobile.ui);
    },

    //-------------Fin Contenido-------------

    //-------------Funciones que involucran app-------------

    scrollToBottom: function () {
        var scroller = app.kendoapp.scroller();
        var pxToScroll = scroller.height() - scroller.scrollHeight();
        if (pxToScroll > 0)
            pxToScroll = 0;
        scroller.scrollTo(0, pxToScroll);
    },

    openAboutView: function (event) {
        app.kendoapp.navigate('#about');
    },

    openTermsView: function (event) {
        app.kendoapp.navigate('#termsAndConditions');
    }

    //-------------Fin Funciones que involucran app-------------

};

// INCIALIZACIÓN DE APP
app.initialize();

function CallAuthenticationWebApi(email, password) {
    jQuery.support.cors = true;
    $.ajax({
        url: WEBAPI + "/AuthenticationResults/Authenticate" + "?email=" + email + "&password=" + password,
        type: 'POST',
        dataType: 'json',
        success: function (data) {
            if (data.AccountLocked) {
                ShowMessage(data.Message);
            } else if (data.Attempts > 0) {
                ShowMessage(data.Message);
            } else if (data.Authenticated === 1) {
                if (data.User.Active) {
                    $plaedu.context.Users.add(data.User);
                    $plaedu.context.saveChanges()
                        .done(function () {
                            loginVM.set("authenticationResult", "");
                            loginVM.set("email", "");
                            app.fillUserVM(data.User);
                            app.kendoapp.replace("#home");
                        })
                        .fail(function (error) {
                            logError("Error grabando en el dispositivo el usuario autenticado.", error);
                        })
                        .always(function () {
                            $(".loadingSpinner").hide();
                        });
                }

                ShowMessage("Usuario Inactivo");
            }
        },
        error: function () {
        }
    });
};

function ShowMessage(message) {
    $(".loadingSpinner").hide();
    document.getElementById("loginResult").removeAttribute("style");
    document.getElementsByClassName("nm-alert")[0].innerHTML = message;
    loginVM.set("authenticationResult", message);
};

// Borra el array destino y lo completa con el array origen
function fillDropDownList(destinationArray, sourceArray, addAll, addNone) {

    destinationArray.splice(0, destinationArray.length);
    destinationArray.length = 0;

    if (addAll)
        destinationArray.push({ Id: -1, Description: "Todos" });

    if (addNone)
        destinationArray.push({ Id: -2, Description: "Ninguno" });

    destinationArray.push.apply(destinationArray, sourceArray);
}

function showModalMessage(title, description) {

    if (title)
        modalmessageVM.set("title", title);

    if (description)
        modalmessageVM.set("description", description);

    $("#modalmessage").data("kendoMobileModalView").open();
}

function hideModalMessage() {
    $("#modalmessage").data("kendoMobileModalView").close();
}

function logError(description, error) {

    if (!LOG_ERRORS)
        return;

    var errorDetail = "";

    if (error.code) {
        errorDetail += "Code: " + error.code;
    }

    if (error.message) {
        errorDetail += " Message: " + error.message;
    }

    if (error.data) {

        if (error.data.length && error.data.length > 0) {

            for (i = 0; i < error.data.length; i++) {

                errorDetail += " data[" + i + "]";

                errorDetail += logJayDataData(error.data[i]);
            }
        }
        else {
            errorDetail += " data: " + logJayDataData(error.data);
        }
    }

    if (error.name) {
        errorDetail += " Name: " + error.name;
    }

    log(description + " " + errorDetail);

}

function logJayDataData(data) {

    var ret = "";

    if (data.message)
        ret += " Message: " + data.message;

    if (data.request && data.request.requestUri)
        ret += " RequestUri: " + data.request.requestUri;

    if (data.request && data.request.method)
        ret += " Method: " + data.request.method;

    if (data.request && data.request.body)
        ret += " Body: " + data.request.body;

    return ret;
}

function log(text) {

    if (!LOG_ERRORS)
        return;

    var logDiv = $('.log');
    logDiv.append(text + ' ');
    //logDiv.scrollTop(logDiv[0].scrollHeight);

    console.log(text);
}

// Muestra un mensaje por 3 segundos o hasta que se oculte
function showToast(message, autoHide) {
    var toastDiv = $(".toast");
    toastDiv.html(message);
    toastDiv.fadeIn(400);
    if (autoHide)
        toastDiv.delay(3000).fadeOut(400);
}

function hideToast() {
    $(".toast").fadeOut(400);
}

function changeToastMessage(message) {
    $(".toast").html(message).delay(3000);
}

function clearAppData() {

    if (gSynchronizing) {
        showModalMessage("Sincronizaci\u00f3n", "Sincronizaci\u00f3n en curso, por favor espere su finalizaci\u00f3n.");
    }
    else {
        log("Borrando datos app. El usuario no se borra...");

        $(".loadingSpinner").show();

        $.when(
            app.emptyTable($plaedu.context.Images),
            app.emptyTable($plaedu.context.CommentMails),
            app.emptyTable($plaedu.context.Cases),
            app.emptyTable($plaedu.context.Pathologies),
            app.emptyTable($plaedu.context.Experts),
            app.emptyTable($plaedu.context.Specialties),
            app.emptyTable($plaedu.context.Countries))
        .then(function () {
            $plaedu.context.saveChanges()
                .then(function () {
                    gConfigLoaded = false;
                    log("BD local vac&iacute;a.");
                })
                .fail(function (error) {
                    logError("Error borrando datos de app.", error);
                })
                .always(function () {
                    $(".loadingSpinner").hide();
                });
        })
        .always(function () {
            $(".loadingSpinner").hide();
        });
    }
}

// FUNCIONES TEMPORALES (BORRAR)

function loginMedico() {
    var usr = 'medico@c-net.com.ar';
    var psw = 'admin';
    $('#txtEmail').val(usr);
    $('#txtPassword').val(psw);
    loginVM.email = usr;
    loginVM.password = psw;
    app.authenticateUser();
}

function openExternalLink() {
    var contentTypeId = $("#txtContentTypeId").val();
    var contentId = $("#txtContentId").val();
    var a = $("#lnkOpenContent").attr('data-Link');

    var uri = IMG_DOWNLOAD_SERVER + "/Pdf/DownloadPdf?contentId=" + contentId;

    if (contentTypeId === "3") {
        var downloadUrl = IMG_DOWNLOAD_SERVER + "/Downloads/DownloadPdf?name=" + a;
        window.open(downloadUrl, '_system', 'location=yes');
        //prepareDownloadPdf(contentId, a);
    }
    else {
        window.open(addhttp(a), '_system', 'location=yes');
    }
}

function addhttp($url) {
    var prefix = 'http://';
    if ($url.substr(0, prefix.length) !== prefix) {
        $url = prefix + $url;
    }
    return $url;
}

function prepareDownloadPdf(contentId, fileName) {
    if (!WP8) {
        var fileURL = "cdvfile://localhost/temporary/" + fileName;
        downloadPdf(contentId, fileURL, fileName);
    }
    else {
        window.requestFileSystem(lfsType, 0, function (fs) {
            fs.root.getDirectory("plaedu", {
                create: true,
                exclusive: false
            }, function (directory) {
                var fileURL = directory.toURL() + "/" + fileName;
                downloadPdf(contentId);
            });
        }, function (error) {
            hideToast();
            console.log("requestFileSystem error code: " + error.code);
            console.log("requestFileSystem error source: " + error.source);
            console.log("requestFileSystem error target: " + error.target);
        });
    }
}

function downloadPdf(contentId, fileURL, fileName) {
    var downloadUrl = IMG_DOWNLOAD_SERVER + "/Downloads/DownloadPdf?name=" + fileName;

    var fileTransfer = new FileTransfer();
    fileTransfer.download(
        encodeURI(downloadUrl),
        "file://sdcard/download/" + fileName,
        function (entry) {
            alert("download complete: " + entry.fullPath);
        },
        function (error) {
            alert("download error source " + error.source);
            alert("download error target " + error.target);
            alert("upload error code" + error.code);
        });
}

function downloadAsset(store, fileName, url) {
    var fileTransfer = new FileTransfer();
    console.log("About to start transfer");
    fileTransfer.download(url, store + fileName,
        function (entry) {
            console.log("Success!");
            showToast(store, true);
            appStart();
        },
        function (err) {
            console.log("Error");
            console.dir(err);
        });
}

//I'm only called when the file exists or has been downloaded.
function appStart() {
    showToast("Success");
}

function fail(error) {
    console.log(error.code);
}




//debugger;
////showToast("Descargando Archivo", true);

//var uri = IMG_DOWNLOAD_SERVER + "/Pdf/DownloadPdf?contentId=" + contentId;

//var fileTransfer = new FileTransfer();

//fileTransfer.download(
//encodeURI(uri),
//fileURL,
//function (entry) {
//    showToast("Success", true);
//    console.log("download complete: " + entry.fullPath);
//},
//function (error) {
//    showToast(error, true);
//    console.log("download error source " + error.source);
//    console.log("download error target " + error.target);
//    console.log("upload error code" + error.code);
//    //hideToast();
//},
//false,
//{
//    headers: {
//        "Authorization": "Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=="
//    }
//});
