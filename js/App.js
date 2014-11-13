var App = (function() {
    return {
        /**
         * Инициализация...
         */
        init: function() {
            this.initMap();
            this.createModels();
            this.createCollection();
            this.loadMarkers();
            this.setMapListeners();
            this.renderInput();
            this.markers = {};
        },
        /**
         * Создание карты
         */
        initMap: function() {
            this.map = new google.maps.Map(document.getElementById("map"), {
              center: new google.maps.LatLng(48.46609081135489, 35.009653572924435),
              zoom: 13,
              mapTypeId: google.maps.MapTypeId.ROADMAP
            });
        },
        /**
         * Создаем коллекцию и вешаем на нее эвенты изменения\удаления маркеров
         */
        createCollection: function() {
            var Collection = Backbone.Collection.extend({
                model: App.Model.Marker
            });
            this.markerCollection = new Collection();
            this.markerCollection.bind("change reset add remove", function(child, collection, state) {
                if(state !== undefined) {
                    if(state.add !== undefined) {
                        App.updateView(child);
                    }
                    if(state.index !== undefined) {
                        child.view.destroy();
                    }
                }
            }, this);
        },
        /**
         * Создание вьюшки модели и установка слушателей на кнопку удаления
         * @param model Моделька маркера
         */
        updateView: function(model) {
            var MyItemsView = Marionette.ItemView.extend({
                template: "#markersTemplate",
                ui: {
                    button: '.deleteMarker'
                },
                events: {
                    'click .deleteMarker': 'clickedButton',
                    'mouseover .deleteMarker': 'startBounce',
                    'mouseout .deleteMarker': 'stopBounce'
                },
                clickedButton: function() {
                    if(this.model.deleteMarker()) {
                        this.destroy();
                    }

                },
                startBounce: function() {
                    this.model.startBounce();
                },
                stopBounce: function() {
                    this.model.stopBounce();
                }
            });

            var view = new MyItemsView({
                model: model
            });
            document.getElementById('markersList').appendChild(view.render().el);
            model.view = view;
        },
        /**
         * Создание модели загрузки списка маркеров и модели самого маркера
         */
        createModels: function() {
            var t = this;
            this.Model = {};

            this.Model.LoadMarker = Backbone.Model.extend({
                defaults: {
                },
                url:"service.php?action=list"
            });

            this.Model.Marker = Backbone.Model.extend({
                defaults: {
                    lat: '',
                    lng: '',
                    id: ''
                },
                setListeners: function() {
                    var markerObj = t.markers[this.get('id')],
                        currentModel = this;
                    google.maps.event.addListener(markerObj,'dragend',function(event) {
                        currentModel.set({
                            lat: event.latLng.lat(),
                            lng: event.latLng.lng()
                        });
                        currentModel.saveMarker();
                    });
                    google.maps.event.addListener(markerObj,'dblclick',function() {
                        currentModel.deleteMarker();
                    });
                },
                saveMarker: function() {
                    this.url = 'service.php?action=create';
                    this.save({}, {
                        success: function(model, response) {
                            if(response.status === 'error') {
                                alert('Something went wrong');
                            }
                        }
                    });

                },
                deleteMarker: function() {
                    if(confirm('Delete this marker?')) {
                        var id = this.get('id'),
                            markerObj = App.markers[id],
                            currentModel = this;
                        this.url = 'service.php?action=delete';
                        this.save({}, {
                            success: function (model, response) {
                                if(response.status === 'success') {
                                    markerObj.setMap(null);
                                    App.markerCollection.remove(currentModel.cid);
                                    delete(App.markers[id]);
                                }
                                else {
                                    alert('Something went wrong');
                                }

                            }
                        });
                        return true;
                    }
                    return false;
                },
                startBounce: function() {
                    var markerObj = App.markers[this.get('id')];
                    markerObj.setAnimation(google.maps.Animation.BOUNCE);
                },
                stopBounce: function() {
                    var markerObj = App.markers[this.get('id')];
                    markerObj.setAnimation(google.maps.Animation.j);
                }
            });
        },
        /**
         * Загрузка списка маркеров
         */
        loadMarkers: function() {
            var t = this,
                model = new this.Model.LoadMarker();
            model.fetch({
                success: function(model, response) {
                    _.each(response, function(i) {
                        var location = new google.maps.LatLng(i.lat, i.lng);
                        t.createMarker(location, i.id, false);
                    });
                }
            });

        },
        /**
         * Устанавливаем слушателей самой карты
         */
        setMapListeners: function() {
            var t = this;
            google.maps.event.addListener(this.map, 'click', function(event) {
                t.createMarker(event.latLng);
            });
        },
        /**
         *
         * @param location объект гугловского положения
         * @param id ID маркера
         * @param {Bool|undefined} save Нужно ли отправлять запрос на сервер для сохранения маркера
         */
        createMarker: function(location, id, save) {
            var t = this;
            if(id === undefined) {
                id = + new Date;
            }
            var marker = new google.maps.Marker({
                position: location,
                map: this.map,
                draggable: true,
                id: id
            });
            this.markers[id] = marker;
            t.createMarkerModel({
                lat: location.lat(),
                lng: location.lng(),
                id: id,
                save: save
            });
        },
        /**
         * Создание модельки маркера по входящим данным
         * @param data
         */
        createMarkerModel: function(data) {
            var markerModel = new this.Model.Marker({
                lat: data.lat,
                lng: data.lng,
                id: data.id
            });
            markerModel.setListeners();
            if(data.save !== false) {
                markerModel.saveMarker();
            }
            this.markerCollection.add(markerModel);
        },
        /**
         * рендер блока адреса
         */
        renderInput: function() {
            var InputView = Backbone.View.extend({
                el: '#inputContainer',
                events: {
                    'click #addMarker': 'addMarker'
                },
                render: function () {
                    this.$el.html(_.template(document.getElementById('inputTemplate').innerHTML));
                    return this;
                },
                addMarker: function() {
                    App.addMarkerByAddress(this.$el.find('#markerAddress').val());
                }
            });
            var c = new InputView();
            c.render();
        },
        /**
         * Получение координат по указанному адресу через geocode и создание маркера, если все ок :)
         * @param {String} address Строка адреса
         */
        addMarkerByAddress: function(address) {
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'address': address}, function(results, status) {
                if(status === 'OK') {
                    App.createMarker(results[0].geometry.location);
                }
            });
        }
    }
}()); 
