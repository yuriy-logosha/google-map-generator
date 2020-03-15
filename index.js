    let $$ = (tag) => {
        let _o = document.createElement(tag);
        _o.set = (property, value) => {_o[property] = value; return _o}
        return _o;
    };
    let $ = (id) => document.getElementById(id);
    let $doc = (id) => document[id];


    let home = {lat: 56.95309568029149, lng: 24.1818463802915};
    var map = {};
    let markers = [];
    let types = [];
    let rooms = new Set();
    let locations = [];
    let currentMarker = false;

    let main_url = "https://www.google.com/maps/vt/icon/name="

    let house = 'assets/icons/poi/quantum/pinlet/home_pinlet-2-medium.png'
    let heart = 'assets/icons/poi/quantum/pinlet/heart_pinlet-2-medium.png'

    let highlight_red  = '&highlight=ff000000,ea4335,a50e0e'
    let highlight_blue = '&highlight=ffffff,ffffff,4285f4,ffffff'

    let spotlight          = 'assets/icons/spotlight/spotlight_pin_v3-1-small.png'
    let spotlight_shadow   = 'assets/icons/spotlight/spotlight_pin_v3_shadow-1-small.png'

    let pinlet          = 'assets/icons/poi/tactile/pinlet_v3-2-medium.png'
    let pinlet_outline  = 'assets/icons/poi/tactile/pinlet_outline_v3-2-medium.png'
    let pinlet_shadow   = 'assets/icons/poi/tactile/pinlet_shadow_v3-2-medium.png'

    let icons = {
      flat: { name: 'Flat', icon: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v3_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v3-1-small.png,assets/icons/spotlight/spotlight_pin_v3_dot-1-small.png&highlight=ff000000,ea4335,a50e0e?scale=1'},
      flats: { name: 'Flat', icon: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v3_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v3-1-small.png&highlight=ff000000,ea4335?scale=1'},
      flat0: { type: '103-я', icon: 'ico/103.png'},
      flat1: { type: '104-я', icon: 'ico/104.png'},
      flat2: { type: '119-я', icon: 'ico/119.png'},
      flat3: { type: '467-я', icon: 'ico/467.png'},
      flat4: { type: '602-я', icon: 'ico/602.png'},
      flat6: { type: 'Лит. пр.', icon: 'ico/LTP.png'},
      flat7: { type: 'М. сем.', icon: 'ico/SEM.png'},
      flat8: { type: 'Нов.', icon: 'ico/NEW.png'},
      flat10: { type: 'Спец. пр.', icon: 'ico/SPEC.png'},
      house: { name: 'House', icon: 'https://www.google.com/maps/vt/icon/name=assets/icons/spotlight/spotlight_pin_v3_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v3-1-small.png,assets/icons/spotlight/spotlight_pin_v3_dot-1-small.png&highlight=ff000000,f0e82e,56890e?scale=1'},
      default: { name: 'Default', icon: ''},
      getIconByType: (type) => {
        ico = icons[Object.keys(icons).some( el => el.type === type).id]
        if (!ico) {
            return icons['default'].icon;
        } else {
            return ico.icon;
        }
      }
    };

    function getIcon(location){
        if (location.type === 'flat') {
            let s = new Set();
            location.cnt.forEach(el => s.add(el.type));
            if (s.size === 1) {
                return icons.getIconByType(s.values().next().value)
            }
        }
        return icons['default'].icon
    }

    function stringTemplateParser(expression, valueObj) {
        const templateMatcher = /{{\s?([^{}\s]*)\s?}}/g;
        let text = expression.replace(templateMatcher, (substring, value, index) => {
            value = valueObj[value];
            return value;
        });
        return text
    }

    function updateContent(address, cnt) {
        let urlWrapper = (content) => {return '<a target="_blank" href="{{url}}">'+content+'</a>'}
        let price = '<b>{{price}}</b>'
        let date = '<td style="text-align:right">{{date}}</td>';
        let str1 = '<td style="text-align:right">{{type}}</td><td style="text-align:right">';
        let str1_1 = '</td><td style="text-align:right">{{m2}}m2</td><td style="text-align:right">{{level}}</td><td style="text-align:right">{{price_m2}}/m2</td><td style="text-align:right">';
        let z = `<div class="poi-info-window gm-style"><div class="title full-width">${address}</div><table>`;
        cnt.sort((a, b) => a.rooms - b.rooms)
            .filter(el => isEnabled(el))
            .forEach(el => {
                let lines = '';
                if (el.hasOwnProperty('prices')) {
                    el.prices.forEach(p => lines += p.price+" ("+p.date+") ")
                }
                let img = lines?'<span title="'+lines+'"><img class="arrow" src="ico/arrow_'+(el.arrow===0?'up':'down')+'.png"/></span>':'';
                let str2 = str1_1+price+img+'</td>'+date;
                if (el.hasOwnProperty('url')) {
                    str2 = str1_1+urlWrapper(price)+img+'</td>'+date;
                }
                let template = str1 + (el.hasOwnProperty('rooms') && el['rooms']?'{{rooms}} &#1082;.':"") + str2;
                z += '<tr>'+stringTemplateParser(template, el)+'</tr>'
        });

        z += '</table></div>';
        if (document.infowindow) {
            document.infowindow.close();
        }
        document.infowindow = new google.maps.InfoWindow({content: z});
    }

    let ranges = {
        range1: { display: '<50k', from: 0, to: 50000},
        range2: { display: '50-100k', from: 50001, to: 100000},
        range3: { display: '100-150k', from: 100001, to: 150000},
        range4: { display: '150-200k', from: 150001, to: 200000},
        range5: { display: '200-300k', from: 200001, to: 300000},
        range6: { display: '300-500k', from: 300001, to: 500000},
        range7: { display: '>500k', from: 500001, to: Number.MAX_SAFE_INTEGER}
    };

    let rangesKeys = Object.keys(ranges);

    let identifyRangeKey = (p) => {
        for(idx in rangesKeys) {
            let rangeName = rangesKeys[idx];
            if(ranges[rangeName].from <= p && p <= ranges[rangeName].to) {
                return rangeName;
            }
       }
       return rangesKeys[rangesKeys.length-1];
    }

    let isEnabled = (el) => {return !el.hasOwnProperty('enabled') || (el.hasOwnProperty('enabled') && el.enabled)}
    let buildFlatId = (key) => `flats${key}`;
    let buildTypeId = (key) => `type${key}`;
    let buildHouseId = (key) => `house${key}`;

    let pricesPerRange = (rangeKey) => {
        let calculateItems = (total, el) => {
            return total + el.cnt.filter(el=> {let n = el.current_price; let r = ranges[rangeKey]; return n >= r.from && n < r.to}).length;
        }

        return markers.reduce(calculateItems, 0);
    }

    let rangesM2 = {
        m2range1: {display: '< 50', from: 0, to: 50},
        m2range2: {display: '51-60', from: 51, to: 60},
        m2range3: {display: '61-90', from: 61, to: 90},
        m2range4: {display: '91-120', from: 91, to: 120},
        m2range5: {display: '  > 121', from: 121, to: 999999},
    }

    let rangesM2Keys = Object.keys(rangesM2);

    let identifyRangeM2Key = (m2) => {
        for(idx in rangesM2Keys) {
            let rangeName = rangesM2Keys[idx];
            if(rangesM2[rangeName].from < m2 && m2 <= rangesM2[rangeName].to) {
                return rangeName;
            }
       }
       return rangesM2Keys[rangesM2Keys.length-1];
    }

    let flatsPerM2 = (range) => {
        let calculateItems = (total, el) => {
            return total + el.cnt.filter(el=> {let n = parseInt(el.m2); let r = rangesM2[range]; return n > r.from && n <= r.to}).length;
        }

        return markers.reduce(calculateItems, 0);
    }

    let houses = $('houses');
    let flats = $('flats');

    let getHouses = () => {if (!houses) {houses = $('houses')} return houses}
    let getFlats = () => {if (!flats) {flats = $('flats')} return flats}

    let getCheck = (type) => {
        return (type === 'house')? getHouses():getFlats();
    }

    let range_m2_check = (el) => {$doc(el.range_m2).checked}
    let range_price_check = (el) => {$doc(el.range_price).checked}
    let type_check = (el) => {$doc(`type${types.find(t => t.type === el.type).id}`).checked}

    let rules = [type_check, range_m2_check, range_price_check];

    let updateState = async () => {
        let documentHousesCheck = document['houses'];

        markers.forEach(async m => {
            let n = 0;
            m.cnt.forEach(async el => {
                let mEnabled = (m.type === 'flat'?document[buildFlatId(el.rooms)].checked:true || m.type === 'house'?documentHousesCheck.checked:true);
                if (mEnabled) {
                    el.enabled =
                    $doc(el.range_m2).checked && $doc(el.range_price).checked &&
                    $doc(`type${types.find(t => t.type === el.type).id}`).checked &&
                    ($doc('pricesDown').checked?el.hasOwnProperty('prices') && el.prices.length >= 1 && el.prices[0].extracted_price > el.current_price:true) &&
                    ($doc('pricesUp').checked?el.hasOwnProperty('prices') && el.prices.length >= 1 && el.prices[0].extracted_price < el.current_price:true);

                    if (el.enabled) {
                        n++;
                    }
                } else el.enabled = false;
            });
            //let n = m.cnt.filter(el => isEnabled(el)).length;
            m.setLabel(n > 1? n+"" : null);
            m.setMap(n===0 || !getCheck(m.type).checked? null : map)

        });

        displayMarker();
    }

    function toggle(checked) {
        if (checked != this.checked) {
            this.click();
        }
    }

    function createCheckBox(parent, id, label, handler, value) {
        let oldValue = localStorage.getItem(id);
        if (value === true || value === false) {
            value = value;
        } else {
            value = true
        }
        if (oldValue) {
            let isTrue = oldValue === 'true';
            value = isTrue?true:false;
        }
        let div = $$("div").set('id', id+'-div');
        let checkbox = $$("input").set('type', 'checkbox').set('id', id).set('name', id).set('value', id).set('checked', value).set('className', 'flat-checkbox').set('onclick', (event) => {localStorage.setItem(id, event.target.checked); (handler)?handler(event):null;})
        let chckLbl = $$("label").set('className', "flat-checkbox-label").set('htmlFor', checkbox.id).set('innerHTML', label);

        document[id] = checkbox;

        checkbox.toggle = toggle;

        div.appendChild(checkbox);
        div.appendChild(chckLbl);
        parent.appendChild(div);
        return checkbox;
    }

    function updateFlatsControlPanel(el) {
        document.infowindow.close();
        let flats = el.target;
        if (flats.checked) {
            rooms.forEach((el, i) => {$('flats'+el).toggle(true)});
        } else {
            rooms.forEach((el, i) => {$('flats'+el).toggle(false)});
        }
        updateState();
    }


    function removePopUp(map) {
        if (map && map.childNodes) {
            for(c in map.childNodes) {
                let child = map.childNodes[c];
                if (child && child.innerText && child.style.cssText.includes('background-color: white; font-weight: 500; font-family: Roboto, sans-serif; padding: 15px 25px; box-sizing: border-box; top: 5px; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 5px; left: 50%; max-width: 375px; position: absolute; transform: translateX(-50%); width: calc(100% - 10px); z-index: 1;')) {
                    map.removeChild(child);
                    return;
                }
            }
        }
    }

    function processElement(parent, el) {
        if (parent && el && el.style && el.style.cssText.includes('background-color: rgba(0, 0, 0, 0.5)')) {
            parent.removeChild(el)
            return;
        }

        if (el && el.childNodes) {
            for(c in el.childNodes) {
                processElement(el, el.childNodes[c]);
            }
        }
    }

    function getJSON(path, callback) {
        let httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200) {
                    let data = JSON.parse(httpRequest.responseText);
                    if (callback) callback(data);
                }
            }
        };
        httpRequest.open('GET', path);
        httpRequest.send();
    }

    function initMap() {
        let new_home = localStorage.getItem('center');
        if (new_home) {
            home = JSON.parse(new_home);
        }
        let new_zoom = localStorage.getItem('zoom');

        map = new google.maps.Map($('map'), {
            zoom: (new_zoom)?parseInt(new_zoom):15,
            center: home,
            mapTypeId: 'hybrid'
        });

        map.controls[google.maps.ControlPosition.TOP_LEFT].push($('roomsControl'));
        map.controls[google.maps.ControlPosition.TOP_LEFT].push($('housesControl'));
        map.controls[google.maps.ControlPosition.LEFT_TOP].push($('typesControl'));
        map.controls[google.maps.ControlPosition.LEFT_TOP].push($('pricesControl'));
        map.controls[google.maps.ControlPosition.LEFT_TOP].push($('m2Control'));
        map.controls[google.maps.ControlPosition.LEFT_TOP].push($('pricesUpDown'));

        document.infowindow = new google.maps.InfoWindow({content: ""});

        createCheckBox($('housesControl'), "houses", "Houses", updateState);
        createCheckBox($('roomsControl'), "flats", "Flats", updateFlatsControlPanel);
        createCheckBox($('pricesUpDown'), "pricesUp", '<img class="arrow" src="ico/arrow_up.png"/>', updateState, false);
        createCheckBox($('pricesUpDown'), "pricesDown", '<img class="arrow" src="ico/arrow_down.png"/>', updateState, false);

        map.addListener('center_changed', () => {
            let c = map.getCenter();
            localStorage.setItem('center', JSON.stringify({lat: c.lat(), lng: c.lng()}));
        });

        map.addListener('zoom_changed', () => { localStorage.setItem('zoom', map.getZoom()) });
        map.addListener('tilesloaded', () => { removePopUp($('map')); processElement(null, $('map')); });
        google.maps.event.addDomListener($('typesControl'), 'click', updateState);

    }

    let processLocations = (data) => {
        locations = data;

        let uniqueTypes = new Set();
        locations.forEach((location, i) => {
            location.cnt.forEach(el=> {
                rooms.add(el.rooms);
                uniqueTypes.add(el.type);
                el['range_price'] = identifyRangeKey(el.current_price);
                el['range_m2'] = identifyRangeM2Key(parseInt(el.m2));
            });
        });

        let i = 0
        for (let uniqueType of Array.from(uniqueTypes).sort()) {
            types[types.length] = {'type': uniqueType, 'id':i};
            i ++;
        }
    }

    let displayMarker = function () {
        if(!map) console.error("No MAP initialized yet.");
        if (!currentMarker || !currentMarker.getMap()) {
            return;
        }

        updateContent(currentMarker.title, currentMarker.cnt);
        document.infowindow.open(map, currentMarker);
    }

    let buildMarkers = () => {
        if(!map) console.error("No MAP initialized yet.");

        types.forEach(el => createCheckBox($('typesControl'), buildTypeId(el.id), el.type));

        markers = locations.map(function(location, i) {
            let m = new google.maps.Marker({
                tag: location.lat + '-' + location.lng,
                mapTypeControl: true,
                position: location,
                type: location.type,
                cnt: location.cnt,
                label: (location.label)?{text: location.label}:null,
                title: location.title+""
                ,icon: getIcon(location)
            });
            m.addListener("click", function() { currentMarker = this; displayMarker()});
            if (currentMarker && currentMarker.getMap() && currentMarker.position.lat() === m.position.lat() && currentMarker.position.lng() === m.position.lng()) {
                currentMarker = m;
                updateContent(currentMarker.title, currentMarker.cnt);
            }
            return m;
        });

        rangesKeys.forEach(el=> createCheckBox($('pricesControl'), el, `<div class="inline-50">${ranges[el].display}</div><div style="display:inline;">(${pricesPerRange(el)})</div>`, updateState));
        rangesM2Keys.forEach(el=> createCheckBox($('m2Control'), el, `<div class="inline-35">${rangesM2[el].display}</div><div style="display:inline">(${flatsPerM2(el)})</div>`, updateState));
        Array.from(rooms).sort().forEach(el=> createCheckBox($('roomsControl'), buildFlatId(el), el, updateState));
    }


    let reBuildMarkers = () => {
        if(!map) console.error("No MAP initialized yet.");

        types.forEach(el => createCheckBox($('typesControl'), buildTypeId(el.id), el.type));

        markers.forEach((m) => {
            let l = locations.find(el => m.tag === el.lat + '-' + el.lng);
            if(l.length === 0){
                delete m;
                if (currentMarker && currentMarker.getMap() && currentMarker.position.lat() === m.position.lat() && currentMarker.position.lng() === m.position.lng()) {
                    currentMarker = false;
                    if (document.infowindow) {
                        document.infowindow.close();
                    }
                }
            } else {
                m.type = l.type;
                m.cnt = l.cnt;
                m.label = (l.label)?{text: l.label}:null;
                m.title = l.title+"";
                m.icon = getIcon(l);
                if (currentMarker && currentMarker.getMap() && currentMarker.position.lat() === m.position.lat() && currentMarker.position.lng() === m.position.lng()) {
                    currentMarker = m;
                    updateContent(currentMarker.title, currentMarker.cnt);
                }
            }

        });

        locations.map(function(location, i) {
            if(markers.find(el => el.tag === location.lat + '-' + location.lng).length === 0){
                let m = new google.maps.Marker({
                    tag: location.lat + '-' + location.lng,
                    mapTypeControl: true,
                    position: location,
                    type: location.type,
                    cnt: location.cnt,
                    label: (location.label)?{text: location.label}:null,
                    title: location.title+""
                    ,icon: getIcon(location)
                });
                m.addListener("click", function() { currentMarker = this; displayMarker()});
                markers.push(m);
            }
        });

        rangesKeys.forEach(el=> createCheckBox($('pricesControl'), el, `<div class="inline-50">${ranges[el].display}</div><div style="display:inline;">(${pricesPerRange(el)})</div>`, updateState));
        rangesM2Keys.forEach(el=> createCheckBox($('m2Control'), el, `<div class="inline-35">${rangesM2[el].display}</div><div style="display:inline">(${flatsPerM2(el)})</div>`, updateState));
        Array.from(rooms).sort().forEach(el=> createCheckBox($('roomsControl'), buildFlatId(el), el, updateState));
    }

    let cleanMarkers = () => {
        Array.from(rooms).sort().forEach(el=> $('roomsControl').removeChild($(buildFlatId(el)+'-div')));
        rooms = new Set();

        types.forEach(el => $('typesControl').removeChild($(buildTypeId(el.id)+'-div')));

        types = [];

        rangesKeys.forEach(el=> $('pricesControl').removeChild($(el+'-div')));
        rangesM2Keys.forEach(el=> $('m2Control').removeChild($(el+'-div')));
    }


    let loadData = () => {getJSON('locations.json', (data) => {processLocations(data); initMap(); buildMarkers(); updateState()})}
    let reLoadData = () => {getJSON('locations.json', (data) => {cleanMarkers(); processLocations(data); reBuildMarkers(); updateState()})}

    setTimeout(loadData, 1);

    setInterval(reLoadData, 60000);

