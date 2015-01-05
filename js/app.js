/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var shareCounter;
var shareCounterMax = 30;

var app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function () {
        app.run();
        //app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    //receivedEvent: function(id) {
    //    var parentElement = document.getElementById(id);
    //    var listeningElement = parentElement.querySelector('.listening');
    //    var receivedElement = parentElement.querySelector('.received');

    //    listeningElement.setAttribute('style', 'display:none;');
    //    receivedElement.setAttribute('style', 'display:block;');

    //    console.log('Received Event: ' + id);
    //}

    run: function () {

        debugger;

        var initialView = "home";
        var now = new Date();
        var expireDate = new Date(2015, 1, 11); // Fecha de caducidad: 10/02/2015 TODO: Definir fecha de caducidad

        if (now >= expireDate)
            initialView = "appexpired";

        // create the Kendo UI Mobile application
        app.kendoapp = new kendo.mobile.Application(document.body, {
            skin: "flat",
            initial: initialView
        });

        //window.plugins.emailComposer = new EmailComposer();

        $("#shareCounterMax").html(shareCounterMax);

        if (!window.localStorage.getItem("counter")) {
            window.localStorage.setItem("counter", shareCounterMax);
        }

        shareCounter = parseInt(window.localStorage.getItem("counter"), 10); // Base 10

        $data.Entity.extend('$plaedu.Types.InMail', {
            'CommentId': { 'type': 'int', 'key': true, 'computed': true },
            'PathologyId': { 'type': 'int', 'required': true },
            'Subject': { 'type': 'string', 'required': true },
            'Text': { 'type': 'string', 'required': true },
            'ExpertId': { 'type': 'int', 'required': true },
            'Images': { 'type': 'Array', 'elementType': '$plaedu.Types.Image', 'navigationProperty': 'InMail', 'nullable': true },
            'Synchronized': { 'type': 'bool', 'nullable': true, 'required': false },
        });

        $data.Entity.extend("$plaedu.Types.Image", {
            'ImageId': { 'type': 'int', 'key': true, 'computed': true },
            'Bitmap': { 'type': 'blob', 'required': true },
            'InMail': { 'type': '$plaedu.Types.InMail', 'navigationProperty': 'Images' }
        });

        $data.EntityContext.extend('$plaedu.Types.PlaeduContext', {
            InMail: { type: $data.EntitySet, elementType: $plaedu.Types.InMail },
            Image: { type: $data.EntitySet, elementType: $plaedu.Types.Image }
        });

        $plaedu.context = new $plaedu.Types.PlaeduContext({ name: "webSql", databaseName: "Plaedu" });

        $('#newInMailForm').submit(app.saveInmail);

    },

    saveInmail: function () {

        debugger;

        var ddlPathology = $('#ddlPathology').val();
        var txtSubject = $('#txtSubject').val();
        var txaText = $('#txaText').val();
        var ddlExpert = $('#ddlExpert').val();

        if (!ddlPathology || !txtSubject || !txaText || !ddlExpert)
            return;

        var newInMail = new $plaedu.Types.InMail(
            {
                // TODO: Ver que valor tiene que tomar CommentId y agregar imagenes al objeto
                CommentId: 1, 
                PathologyId: ddlPathology,
                Subject: txtSubject,
                Text: txaText,
                ExpertId: ddlExpert,
                Synchronized: false
            });

        $plaedu.context.InMail.add(newInMail);
        $plaedu.context.saveChanges();

        debugger;

        //$todo.context.Todo.length(function (cnt) { alert("There are " + cnt + " person(s) in the database."); });
    }
};

app.initialize();