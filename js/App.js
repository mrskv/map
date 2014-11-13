var App = (function() {
    var Obj = {
        /**
         * Инициализация...
         */
        init: function() {
            Obj.initMap();
            Obj.createModels();
            Obj.createCollection();
            Obj.loadMarkers();
            Obj.setMapListeners();
            Obj.renderInput();
            Obj.markers = {};
        },
        /**
         * Создание карты
         */
        initMap: function() {
            Obj.map = new google.maps.Map(document.getElementById("map"), {
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
                model: Obj.Model.Marker
            });
            Obj.markerCollection = new Collection();
            Obj.markerCollection.bind("add", function(child) {
                Obj.createView(child);
            }, this);
        },
        /**
         * Создание вьюшки модели и установка слушателей на кнопку удаления
         * @param model Моделька маркера
         */
        createView: function(model) {
            var MyItemsView = Marionette.ItemView.extend({
                template: "#markersTemplate",
                events: {
                    'click .deleteMarker': 'deleteMarker',
                    'mouseover .deleteMarker': 'startBounce',
                    'mouseout .deleteMarker': 'stopBounce'
                },
                deleteMarker: function() {
                    this.model.deleteMarker();
                },
                startBounce: function() {
                    var markerObj = Obj.markers[this.model.get('id')];
                    markerObj.setAnimation(google.maps.Animation.BOUNCE);
                },
                stopBounce: function() {
                    var markerObj = Obj.markers[this.model.get('id')];
                    markerObj.setAnimation(google.maps.Animation.j);
                }
            });

            var view = new MyItemsView({
                model: model
            });

            document.getElementById('markersList').appendChild(view.render().el);
            model.on('destroy', function() {
                view.destroy();
                console.log(Obj.markerCollection);
            }, this);
        },
        /**
         * Создание модели загрузки списка маркеров и модели самого маркера
         */
        createModels: function() {
            Obj.Model = {};

            Obj.Model.LoadMarker = Backbone.Model.extend({
                defaults: {
                },
                url:"service.php?action=list"
            });

            Obj.Model.InputModel = Backbone.Model.extend({
                defaults: {
                    address: ''
                },
                addMarker: function() {
                    Obj.addMarkerByAddress(this.get('address'));
                }
            });

            Obj.Model.Marker = Backbone.Model.extend({
                setListeners: function() {
                    var markerObj = Obj.markers[this.get('id')],
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
                            currentModel = this;
                        this.url = 'service.php?action=delete';
                        this.save({}, {
                            success: function (model, response) {
                                if(response.status === 'success') {
                                    currentModel.destroy();
                                    Obj.markers[id].setMap(null);
                                    delete(Obj.markers[id]);
                                }
                                else {
                                    alert('Something went wrong');
                                }

                            }
                        });
                        return true;
                    }
                    return false;
                }
            });
        },
        /**
         * Загрузка списка маркеров
         */
        loadMarkers: function() {
            var model = new Obj.Model.LoadMarker();
            model.fetch({
                success: function(model, response) {
                    _.each(response, function(i) {
                        var location = new google.maps.LatLng(i.lat, i.lng);
                        Obj.createMarker(location, i.id, false);
                    });
                }
            });

        },
        /**
         * Устанавливаем слушателей самой карты
         */
        setMapListeners: function() {
            google.maps.event.addListener(Obj.map, 'click', function(event) {
                Obj.createMarker(event.latLng);
            });
        },
        /**
         *
         * @param location объект гугловского положения
         * @param id ID маркера
         * @param {Bool|undefined} save Нужно ли отправлять запрос на сервер для сохранения маркера
         */
        createMarker: function(location, id, save) {
            if(id === undefined) {
                id = + new Date;
            }
            var marker = new google.maps.Marker({
                position: location,
                map: Obj.map,
                draggable: true,
                id: id
            });
            Obj.markers[id] = marker;
            Obj.createMarkerModel({
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
            var markerModel = new Obj.Model.Marker({
                lat: data.lat,
                lng: data.lng,
                id: data.id
            });
            markerModel.setListeners();
            if(data.save !== false) {
                markerModel.saveMarker();
            }
            Obj.markerCollection.add(markerModel);
        },
        /**
         * рендер блока адреса
         */
        renderInput: function() {
            var inputModel = new Obj.Model.InputModel(),
                InputView = Marionette.ItemView.extend({
                    template: "#inputTemplate",
                    events: {
                        'click #addMarker': 'addMarker',
                        'input #markerAddress': 'changeAddress'
                    },
                    changeAddress: function(e) {
                        this.model.set('address', $(e.currentTarget).val());
                    },
                    render: function () {
                        this.$el.html(_.template(document.getElementById('inputTemplate').innerHTML));
                        return this;
                    },
                    addMarker: function() {
                        this.model.addMarker();
                    }
                });
            var c = new InputView({
                model: inputModel
            });
            document.getElementById('inputContainer').appendChild(c.render().el);
        },
        /**
         * Получение координат по указанному адресу через geocode и создание маркера, если все ок :)
         * @param {String} address Строка адреса
         */
        addMarkerByAddress: function(address) {
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'address': address}, function(results, status) {
                if(status === 'OK') {
                    Obj.createMarker(results[0].geometry.location);
                }
            });
        }
    };
    return {
        init: Obj.init
    }
}()); 
