var App = (function() {
    var Obj = {
        /**
         * Инициализация...
         */
        init: function() {
            Obj.markers = {};
            Obj.initMap();
            Obj.createModels();
            Obj.createCollection();
            Obj.setMapListeners();
            Obj.renderInput();
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
                model: Obj.Model.Marker,
                url: 'service.php?action=list'
            });
            Obj.markerCollection = new Collection();
            Obj.markerCollection.bind("add", function(child) {
                Obj.createView(child);
            }, this);
            Obj.markerCollection.fetch();
        },
        /**
         * Создание вьюшки модели и установка слушателей на кнопку удаления
         * @param model Моделька маркера
         */
        createView: function(model) {
            var id = model.get('id'),
                MyItemsView, view, marker;

            MyItemsView = Marionette.ItemView.extend({
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
                    var markerObj = Obj.markers[id];
                    markerObj.setAnimation(google.maps.Animation.BOUNCE);
                },
                stopBounce: function() {
                    var markerObj = Obj.markers[id];
                    markerObj.setAnimation(google.maps.Animation.j);
                }
            });

            view = new MyItemsView({
                model: model
            });

            document.getElementById('markersList').appendChild(view.render().el);
            model.on('destroy', function() {
                view.destroy();
            }, this);

            marker = new google.maps.Marker({
                position: new google.maps.LatLng(model.get('lat'), model.get('lng')),
                map: Obj.map,
                draggable: true,
                id: id
            });
            marker.addListener('dragend',function(event) {
                model.set({
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                });
                model.saveMarker();
            });
            marker.addListener('dblclick',function() {
                model.deleteMarker();
            });

            Obj.markers[id] = marker;
        },
        /**
         * Создание модели загрузки списка маркеров и модели самого маркера
         */
        createModels: function() {
            Obj.Model = {};

            Obj.Model.InputModel = Backbone.Model.extend({
                defaults: {
                    address: ''
                },
                addMarker: function() {
                    Obj.addMarkerByAddress(this.get('address'));
                }
            });

            Obj.Model.Marker = Backbone.Model.extend({
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
         * Устанавливаем слушателей самой карты
         */
        setMapListeners: function() {
            google.maps.event.addListener(Obj.map, 'click', function(event) {
                Obj.createMarkerModel(event.latLng);
            });
        },
        /**
         * Создание модельки маркера по входящим данным
         * @param {Object} location Объект гугловский координат
         */
        createMarkerModel: function(location) {
            var markerModel = new Obj.Model.Marker({
                lat: location.lat(),
                lng: location.lng(),
                id: + new Date
            });
            Obj.markerCollection.add(markerModel);
            markerModel.saveMarker();
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
                }),
                c = new InputView({
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
                    Obj.createMarkerModel(results[0].geometry.location);
                }
            });
        }
    };
    return {
        init: Obj.init
    }
}()); 
