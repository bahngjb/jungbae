// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.

$( document ).ready(function() {
  window.pairs = []
  window.coordinates = []

  $.ajax({
    type: 'GET',
    url: 'https://cs374.s3.ap-northeast-2.amazonaws.com/country_capital_geo.csv',
    dataType: 'text',
    success: function(data) {
      let lines = data.split('\n')
      for(let i = 1; i < lines.length - 1; i++) {
        let country = lines[i].split(',')
        let change = country[3].trim()

        countries = {country: country[0], capital: country[1]}
        coord = {country: country[0], coordinates: [parseFloat(country[2]), parseFloat(change)]}

        pairs.push(countries)
        coordinates.push(coord)
      }
      mapboxgl.accessToken = 'pk.eyJ1IjoibXVyYXRiYWt0dXIiLCJhIjoiY2tvZTVhamNnMDN6NDJucXNscXk3djM5MSJ9.m1q03RjKJPsjygB2TD_FUw';
      var map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/satellite-streets-v11', // style URL
        //center: [-74.5, 40], // starting position [lng, lat]
        zoom: 4 // starting zoom
      });
      
      let country_capital_pairs = pairs
      let capt = get_random();
      let mem = document.getElementById("pr2__country").innerHTML
      let answers = [mem]
      let checks = [capt]
      var map_coordinates = get_coordinates(mem)
      map.setCenter(map_coordinates)

      let capitals = []
      country_capital_pairs.forEach(elem => capitals.push(elem.capital))


      var delay
      $('table').on('mouseenter', 'td#pr2__country, td#country_name', function() {
        var name = $(this).text()
        $(this).closest('tr').css('background-color', 'lightgray')
        var cord = get_coordinates(name)
        delay = setTimeout(function() {
          map.setCenter(cord)
          $('#map').css('border', '3px orange solid')
          map.setZoom(4)
        }, 500)
      })

      $('table').on('mouseleave', 'td#pr2__country, td#country_name', function() {
        $('#map').css('border', '')
        $(this).closest('tr').css('background-color', '')
        clearTimeout(delay)
      })

      $('table').on('mouseenter', 'td#capital_name', function() {
        var name = $(this).text().slice(0, -6)
        $(this).closest('tr').css('background-color', 'lightgray')
        count = get_country(name)
        var cord = get_coordinates(count)
        delay = setTimeout(function() {
          map.setStyle('mapbox://styles/mapbox/dark-v10')
          map.setCenter(cord)
          $('#map').css('border', '3px black solid')
          map.setZoom(6)
        }, 500)
      })
      
      $('table').on('mouseleave', 'td#capital_name', function() {
        $('#map').css('border', '')
        $(this).closest('tr').css('background-color', '')
        map.setStyle('mapbox://styles/mapbox/satellite-streets-v11')
        clearTimeout(delay)
      })

      document.getElementById("pr2__button").addEventListener("click", () => button_click())
      document.getElementById("pr2__capital").addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
          event.preventDefault();
          document.getElementById("pr2__button").click()
        }
      });

      $("#pr2__capital").autocomplete({
        source: function(request, response) {
          let matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
          response($.grep(capitals, function(item){
              return matcher.test(item);
          }) );
        }
      }, {
        minLength: 2,
        select: function( event, ui ) {
          let value = ui.item.value;
          $('#pr2__capital').val(value)
          $('#pr2__button').click()
          $("#pr2__capital").val("")
          return false
        }
      })

      $('#options').on('change', () => {
        if($('#options').val() == 'wrong') {
          $('.correct').hide();
          $('.wrong').show();
          if (!$('.wrong').length && !$('.correct').is(":visible")) {
            $('#empty').show();
          } else {
            $('#empty').hide();
          }
        } else if ($('#options').val() == 'all') {
          $('.correct').show();
          $('.wrong').show();
          if (!$('.wrong').length && !$('.correct').length) {
            $('#empty').show();
          } else {
            $('#empty').hide();
          }
        } else {
          $('.wrong').hide();
          $('.correct').show();
          if(!$('.wrong').is(":visible") && !$('.correct').length) {
            $('#empty').show();
          } else {
            $('#empty').hide();
          }
        }
      })



      $("table").on('click','.remove',function(){
        var target = $(this).closest('tr')[0].id
        //console.log($(this).closest('table tr').index())
        var first = $('td:first', $(this).parents('tr')).text()
        var second = $('td:eq(1)', $(this).parents('tr')).text();
        var third = $('td:eq(2)', $(this).parents('tr')).text().slice(0, -6)
        writeUndoFunctions(first, third, second, $(this).closest('tr')[0].className, 'remove', 0, $(this).closest('table tr').index())
        let userRef = firebase.database().ref('/AnswerBox/' + target)
        userRef.remove()

        $(this).closest('tr').remove();
        if ((!$('.wrong').length && !$('.correct').is(":visible")) || (!$('.correct').length && !$('.wrong').is(":visible"))) {
          $('#empty').show();
        } else {
          $('#empty').hide();
        }
      });

      function clear_func(class_name) {
        if($('table tr').length == 3) {
          alert('No items to clear')
        } else {
          firebase.database().ref('/AnswerBox').once('value').then((snapshot) => {
            var obj = snapshot.val()
            var keys = Object.keys(obj)
            len = keys.length
            for(var i = 0; i < keys.length; i++) {
              var count = keys.length
              if(class_name === obj[keys[i]].class_type) {
                firebase.database().ref('/AnswerBox/').orderByChild('class_type').equalTo(class_name).once('value').then((snapshot) => {
                  snapshot.forEach(function(child) {
                    child.ref.remove()
                  })
                })
              } else if(class_name === '') {
                let userRef = firebase.database().ref('/AnswerBox/' + keys[i])
                userRef.once('value').then((data) => {
                  count--
                  var value = data.val()
                  writeUndoFunctions(value.country_name, value.country_capital, value.user_input, value.class_type, 'all', keys.length, count)
                })
                userRef.remove()
              }
            }
          })
          $('#empty').show()
        }
      }

      $('#pr3__clear').on('click', function() {
        if($('#options').val() == 'wrong') {
          clear_func('wrong')
          $('tr.wrong').remove()
        } else if($('#options').val() == 'correct') {
          clear_func('correct')
          $('tr.correct').remove()
        } else {
          clear_func('')
          $('table').find("tr:gt(2)").remove()
        }
      })
      function deleteAll(path) {
        firebase.database().ref(path).once('value').then((snapshot) => {
          var obj = snapshot.val()
          var keys = Object.keys(obj)
          for(var i = 0; i < keys.length; i++) {
            let userRef = firebase.database().ref(path + keys[i])
            userRef.remove()
          }
        })
      }

      $('#pr3__reset').on('click', function() {
        deleteAll('/UndoActions/')
        deleteAll('/AnswerBox/')
        $('table').find("tr:gt(2)").remove()
        $('#empty').show()
        get_random()
        let mem = document.getElementById("pr2__country").innerHTML
        var map_coordinates = get_coordinates(mem)
        map.setCenter(map_coordinates)
        map.setStyle('mapbox://styles/mapbox/satellite-streets-v11')
        map.setZoom(4)
      })

      function writeUndoFunctions(country, capital, inp, correctness, undo_type, len, ind) {
        var newKey = firebase.database().ref('/UndoActions/').push()
        newKey.set({
          country_name: country,
          country_capital: capital,
          user_input: inp,
          class_type: correctness,
          undo_name: undo_type,
          row_length: len,
          row_index: ind
        })
      }

      $('#pr3__undo').on('click', function() {
        firebase.database().ref().orderByChild('/UndoActions/').once('value').then((data) => {
          if(!data.exists()) {
            alert('Nothing to undo')
          } else {
            firebase.database().ref('/UndoActions/').limitToLast(1).once('child_added').then((snapshot) => {
              var value = snapshot.val()
              if(value.undo_name === 'remove') {
                $('#empty').hide();
                //console.log($(this).closest('table tr').index())
                var id = writeToDatabase(value.country_name, value.country_capital, value.user_input, value.class_type)
                let tr = document.createElement('tr');
                let first = tr.insertCell(0)
                first.setAttribute('id', 'country_name')
                let second = tr.insertCell(1)
                let third = tr.insertCell(2)
                let btn = document.createElement('button')
                btn.innerHTML = 'Remove'
                btn.style.marginLeft = '7px'
                btn.setAttribute('class', 'remove')
                first.innerHTML = value.country_name
                second.innerHTML = value.user_input
                if(value.class_type === 'wrong') second.setAttribute('class', 'line')
                third.append(value.country_capital, btn)
                third.setAttribute('id', 'capital_name')
                tr.setAttribute('class', value.class_type)
                tr.setAttribute('id', id)
                $('table > tbody > tr').eq(value.row_index - 1).after(tr)
                snapshot.ref.remove()
              } else if(value.undo_name === 'add') {
                  firebase.database().ref('/AnswerBox/').limitToLast(1).once('child_added').then((snapshot)=> {
                    var key = snapshot.key
                    $('table tr#' + key).remove()
                    snapshot.ref.remove()
                    if($('table tr').length == 3) {
                      $('#empty').show();
                    }
                  })
                  snapshot.ref.remove()
              } else if(value.undo_name === 'all') {
                var count = 0
                firebase.database().ref('/UndoActions/').limitToLast(value.row_length).on('value', remove)
                function remove(data) {
                  var val = data.val()
                  var keys = Object.keys(val)
                  for(var i = 0; i < keys.length; i++) {
                    let userRef = firebase.database().ref('/UndoActions/' + keys[i])
                    userRef.once('value').then((data) => {
                      var value = data.val()
                      var id = writeToDatabase(value.country_name, value.country_capital, value.user_input, value.class_type)
                      $('#empty').hide();
                      let tr = document.createElement('tr');
                      let first = tr.insertCell(0)
                      first.setAttribute('id', 'country_name')
                      let second = tr.insertCell(1)
                      let third = tr.insertCell(2)
                      let btn = document.createElement('button')
                      btn.innerHTML = 'Remove'
                      btn.style.marginLeft = '7px'
                      btn.setAttribute('class', 'remove')
                      first.innerHTML = value.country_name
                      second.innerHTML = value.user_input
                      if(value.class_type === 'wrong') second.setAttribute('class', 'line')
                      third.append(value.country_capital, btn)
                      third.setAttribute('id', 'capital_name')
                      tr.setAttribute('class', value.class_type)
                      tr.setAttribute('id', id)
                      let table = document.querySelector('tbody');
                      table.append(tr)
                    })
                    userRef.remove()
                    count++
                    if(count === value.row_length) {
                      firebase.database().ref('/UndoActions/').limitToLast(value.row_length).off('value', remove)
                    }
                  }
                }
              }
            })
          }
        })
      })

      function readFromDatabase() {
        return firebase.database().ref('/AnswerBox/').once('value').then((snapshot) => {
          var myValue = snapshot.val()
          if(myValue != null) {
            $('#empty').hide();
            var keyList = Object.keys(myValue)

            for(var i=0; i < keyList.length; i++) {
              var myKey = keyList[i]
              let tr = document.createElement('tr');
              let first = tr.insertCell(0)
              first.setAttribute('id', 'country_name')
              let second = tr.insertCell(1)
              let third = tr.insertCell(2)
              let btn = document.createElement('button')
              btn.innerHTML = 'Remove'
              btn.style.marginLeft = '7px'
              btn.setAttribute('class', 'remove')
              first.innerHTML = myValue[myKey].country_name
              second.innerHTML = myValue[myKey].user_input
              if(myValue[myKey].class_type === 'wrong') second.setAttribute('class', 'line')
              third.append(myValue[myKey].country_capital, btn)
              third.setAttribute('id', 'capital_name')
              tr.setAttribute('class', myValue[myKey].class_type)
              tr.setAttribute('id', myKey)
              let table = document.querySelector('tbody');
              table.append(tr)
            }
          } else {
            $('#empty').show();
          }         
        })
      }

      function writeToDatabase(country, capital, inp, correctness, ind) {
        var newKey = firebase.database().ref('/AnswerBox/').push()
        newKey.set({
          country_name: country,
          country_capital: capital,
          user_input: inp,
          class_type: correctness,
        })
        return newKey.key
      }

      function get_country(capital) {
        for(var i = 0; i < pairs.length; i++) {
          if(capital === pairs[i]['capital']) {
            return pairs[i]['country']
          }
        }
      }

      function get_coordinates(country) {
        for(var i = 0; i < coordinates.length; i++) {
          if(country === coordinates[i]['country']) {
            return coordinates[i]['coordinates']
          }
        }
      }

      function get_random() {
        let rand = country_capital_pairs[Math.floor(Math.random() * country_capital_pairs.length)];
        document.getElementById("pr2__country").innerHTML = rand.country;
        return rand.capital
      }

      function valid() {
        if (document.getElementById("pr2__capital").value === '') {
          return false;
        } else {
          return true;
        };
      }
  
      function button_click() {
        if (!valid()) {
          return false;
        } else {
          $('#empty').hide();
          $('.correct').show();
          $('.wrong').show();
          $('#options').val('all')
          let capt = get_random();
          let cap = document.getElementById("pr2__capital").value.trim()
          answers.push(document.getElementById("pr2__country").innerHTML)
          checks.push(capt)
          var cord = get_coordinates(document.getElementById("pr2__country").innerHTML)
          map.setCenter(cord)
          
          document.getElementById("pr2__capital").value = '';
          document.getElementById("pr2__capital").focus();
          
          let tr = document.createElement('tr');
          let first = tr.insertCell(0)
          first.setAttribute('id', 'country_name')
          let second = tr.insertCell(1)
          let third = tr.insertCell(2)
          third.setAttribute('id', 'capital_name')
          let btn = document.createElement('button')
          btn.innerHTML = 'Remove'
          btn.style.marginLeft = '7px'
          btn.setAttribute('class', 'remove')

          if (cap.toLowerCase() == checks[0].toLowerCase()) {
            first.innerHTML = answers[0]
            second.innerHTML = checks[0]
            third.append(checks[0], btn)
            tr.setAttribute('class', 'correct')
            var but_id = writeToDatabase(first.innerHTML, checks[0], second.innerHTML, tr.className)
            writeUndoFunctions(first.innerHTML, checks[0], second.innerHTML, tr.className, 'add', 0, 0)
            tr.setAttribute('id', but_id)
            checks.shift()
          } else {
            first.innerHTML = answers[0]
            second.innerHTML = cap
            third.append(checks[0], btn)
            second.setAttribute('class', 'line')
            third.style.fontStyle = 'italic'
            tr.setAttribute('class', 'wrong')
            var button_id = writeToDatabase(first.innerHTML, checks[0], second.innerHTML, tr.className)
            writeUndoFunctions(first.innerHTML, checks[0], second.innerHTML, tr.className, 'add', 0, 0)
            tr.setAttribute('id', button_id)
            checks.shift()
          }

          answers.shift()
          let table = document.querySelector('tbody');
          table.append(tr)
        }
      }
      readFromDatabase()
      firebase.database().ref('/AnswerBox/').once('child_changed').then((snapshot) => {
        readFromDatabase()
      })
    }
  })
});