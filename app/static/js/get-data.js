//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function (name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

//function to display list of medications
function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}

//helper function to get quanity and unit from an observation resoruce.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function (observation) {
    var BP = observation.component.find(function (component) {
      return component.code.coding.find(function (coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

// create a patient object to initalize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    note: 'No Annotation',
  };
}

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
  note.innerHTML = annotation;
}

//function to display the observation values you will need to update this
function displayObservation(obs) {
  hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;
  weight.innerHTML = obs.weight;
  height.innerHTML = obs.height;
}

//function to display info about checkup missing
function displayCheckupRecommendation(_string) {
  visit_list.innerHTML += "<li> " + _string + "</li>";
}

function render(data) {
  console.log(data);
  var svg = d3.select("svg");
  var margin = 30;
  var width = svg.attr("width") - margin;
  var height = svg.attr("height") - margin;
  var _barWidth = 15;

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total)])
    .range([height, 0]);
  var xScale = d3.scaleBand().range([0, width]).padding(0.4);
  xScale.domain(data.map(function (d) { return d.year; }));

  var g = svg.append("g")
    .attr("transform", "translate(" + 25 + "," + 0 + ")");

  g.append("g")
    .attr("transform", "translate(-5," + height + ")")
    .call(d3.axisBottom(xScale));

  g.append("g")
    .call(d3.axisLeft(yScale))
    .attr("transform", "translate(0," + 0 + ")");
    if (d3.keys(data).length < 5){
      _barWidth = 50;
    }
  g.selectAll("bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("fill", "#ff0000")
    .attr("x", function (d) { return xScale(d.year); })
    .attr("y", function (d) { return yScale(d.total); })
    .attr("width", _barWidth)
    .attr("height", function (d) { return height - yScale(d.total); });
}

//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function (client) {

  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function (patient) {
      displayPatient(patient);
      console.log(patient);
    }
  );

  // get observation resoruce values
  // you will need to update the below to retrive the weight and height values
  var query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
  query.set("code", [
    'http://loinc.org|8462-4',
    'http://loinc.org|8480-6',
    'http://loinc.org|2085-9',
    'http://loinc.org|2089-1',
    'http://loinc.org|55284-4',
    'http://loinc.org|3141-9',
    'http://loinc.org|8302-2',
    'http://loinc.org|29463-7'
  ].join(","));

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function (ob) {

      // group all of the observation resoruces by type into their own
      var byCodes = client.byCodes(ob, 'code');
      var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
      var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
      var hdl = byCodes('2085-9');
      var ldl = byCodes('2089-1');
      var weight = byCodes('29463-7');
      var height = byCodes('8302-2');

      // create patient object
      var p = defaultPatient();

      // set patient value parameters to the data pulled from the observation resoruce
      if (typeof systolicbp != 'undefined') {
        p.sys = systolicbp;
      } else {
        p.sys = 'undefined'
      }

      if (typeof diastolicbp != 'undefined') {
        p.dia = diastolicbp;
      } else {
        p.dia = 'undefined'
      }
      var _latestObs = weight[0];
      console.log(weight);
      console.log("Latest weight:");
      console.log(_latestObs);
      var _latestNotes = _latestObs.note;
      if (typeof _latestNotes != 'undefined') {
        displayAnnotation(_latestNotes[_latestNotes.length - 1]['text']);
      }
      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);
      p.weight = getQuantityValueAndUnit(weight[0]);
      p.height = getQuantityValueAndUnit(height[0]);
      displayObservation(p);

    });


  function getMedications(Records) {
    var _array = [];
    Records.forEach(function (observation) {
      // console.log(observation);
      // console.log("=====");
      // console.log(client.getPath(observation,"medicationCodeableConcept.text"));
      _array.push(client.getPath(observation, "medicationCodeableConcept.text"));
    });
    //console.log(_array);
    return _array;
  }
  var query2 = new URLSearchParams();
  query2.set("patient", client.patient.id);
  client.request("MedicationRequest?" + query2, {
    pageLimit: 0,
    flat: true
  }).then(
    function (ob) {
      //console.log(ob);
      //console.log(ob.medicationCodeableConcept);
      var _array = [];
      _array = getMedications(ob);
      _array.forEach(function (med) {
        displayMedication(med);
      });
    });
  //update function to take in text input from the app and add the note for the latest weight observation annotation
  //you should include text and the author can be set to anything of your choice. keep in mind that this data will
  // be posted to a public sandbox

  function addWeightAnnotation() {
    annotation = document.getElementById("annotation").value;
    //console.log(document.getElementById("annotation").value);
    var _date = new Date().toISOString();
    var _content = { authorString: "ppham33", time: _date, text: document.getElementById("annotation").value };
    console.log("Before");
    console.log(_latestObs);

    if (annotation === "") {
      console.log("Empty input");
    } else {
      if (typeof _latestObs['note'] != 'undefined') {
        var _temp = _latestObs['note'];
        console.log('temp');
        console.log(_temp);
        _latestObs['note'].push(_content);
      } else {
        _latestObs['note'] = _content;
      }

      client.update(_latestObs, _content);
    }
    console.log('after update');
    console.log(_latestObs);

    displayAnnotation(annotation);

  }

  //event listner when the add button is clicked to call the function that will add the note to the weight observation
  document.getElementById('add').addEventListener('click', addWeightAnnotation);


  var _checkUpDict = {};
  var _others = {};
  var _yearArray = [];
  var _checkUpArray = [];
  var _othersArray = [];
  const _string = "check up";
  var query2 = new URLSearchParams();
  var _isCheckupRecently = 0;
  var _ignore_year = new Date("2010");
  query2.set("patient", client.patient.id);
  client.request("Encounter?" + query2, {
    pageLimit: 0,
    flat: true
  }).then(
    function (ob) {
      ob.forEach(function (_individual) {
        var _count = 0;
        var _countOther = 0;
        var _type = _individual.type;
        var _text = _type[0]["text"];
        var _period = _individual.period["start"];
        var _date = new Date(_period);
        var _year = _date.getFullYear();
        if (_date > _ignore_year) {
          //console.log(_year);
          if (_checkUpDict.hasOwnProperty(_year)) {
            _count = _checkUpDict[_year];
          } else {
            _checkUpDict[_year] = 0;
          }
          if (_others.hasOwnProperty(_year)) {
            _countOther = _others[_year];
          } else {
            _others[_year] = 0;
          }
          if (_text.includes(_string)) {
            _checkUpDict[_year] = _count + 1;
          } else {
            _others[_year] = _countOther + 1;
          }
          _isCheckupRecently = 1;
        } else {
          _isCheckupRecently = 0;
        }// end if _year > ignore_year


      });//end looping each record Encounter
      if (_isCheckupRecently == 1) {
        for (var key in _checkUpDict) {
          _checkUpArray.push({ "year": key, "total": _checkUpDict[key] });
        }
        for (var key in _others) {
          _othersArray.push({ "year": key, "total": _others[key] });
        }
        if (!_checkUpDict.hasOwnProperty("2020")) {
          console.log("No check up recently");
          displayCheckupRecommendation("You haven't visited doctor in 2020");
        } else {
          console.log("Check up");
          displayCheckupRecommendation("Good work! You are maintaining a good checkup routine");

        }

        var data = _checkUpArray.map(d => {
          return {
            year: d[Object.keys(d)[0]],
            total: d[Object.keys(d)[1]]
          }
        });
        render(data);
      } else {
        displayCheckupRecommendation("No checkup records available in the last 10 years!");
      }//end if else 

    });

}).catch(console.error);
