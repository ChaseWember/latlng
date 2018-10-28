const db = require('../db')
const request = require('request')

let googleAPIkey = 'AIzaSyBhfRtDhhVWqWQbYj_MyMnomLbKdxOn7LM'

// #3 populate url with zip code and google api and save response
//rename 
function getGoogleplacesResult(postalCode, googleAPIkey) {
  return new Promise((resolve, reject) => {

    let https = require('https');
    let url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=" + postalCode + "&inputtype=textquery&fields=geometry&key=" + googleAPIkey

    request(url, function (err, res, body) {
      //console.log('before if')
      if (err) {
        console.log('Error', err)
        reject(err)
        //check status
      } else {
        //console.log('HERE', body)
        resolve(body)
      }
    })
  })
}

//insert lat lng into gis_points 
//update expert/customer with locationID
function updateTables(googlePlaces, postalCodeArray, i, status) {
  //get lat and lng 
  let lat = googlePlaces.candidates[0].geometry.location.lat
  let lng = googlePlaces.candidates[0].geometry.location.lng

  db.get()
    .then(function (connection) {
      //insert lat lng into gis_points and update customer with locationID 
      let sql = `INSERT INTO gis_points (point) VALUES (ST_POINTFROMTEXT(?))`
      connection.query(sql, [`POINT(${lng} ${lat})`], function (err, result) {
        if (err) {
          console.log(err)
        } else {
          let locID = result.insertId
          if (status === 'customer') {
            let sql = `UPDATE customer SET locationId = ${locID} WHERE id = ${postalCodeArray[i].id}`
            connection.query(sql, function (err, result) {
              if (err) {
                console.log(err)
              } else {
                console.log(`customer ${postalCodeArray[i].id}'s locationID has been updated to ${locID}`)
              }
            })
          } else if (status === 'expert'){
            let sql = `UPDATE expert SET locationId = ${locID} WHERE userProfileID = ${postalCodeArray[i].userProfileID}`
            connection.query(sql, function (err, result) {
              if (err) {
                console.log(err)
              } else {
                console.log(`expert ${postalCodeArray[i].userProfileID}'s locationID has been updated to ${locID}`)
              }
            })
          } else {
            console.log(err)
          }
        }
        connection.release()
      })
    })
    .catch(function (err) {
      console.log(err)
    })
}

//MAIN customer 
exports.getCustomerLocation = function (req, res) {
  db.get()
    .then(function (connection) {
      //get id and postalcodes from customer where location Id is null and postalCode is not null 
      connection.query(`SELECT id, postalCode FROM customer WHERE locationID is null AND postalCode is not null`, function (err, result) {
        if (err) {
          console.log(err)
        } else {
          let postalCodeArray = result
          //loop to get through all zips returned 
          
          for (let i = 0; i < postalCodeArray.length; i++) {
            let postalCode = postalCodeArray[i].postalCode

            //make sure postal code is vaild 
            if (postalCode.length < 5) {
              console.log(`'${postalCode}' is not a vail postalCode`)
            } else {
              // #3 populate url with zip code and google apiKey and save response
              getGoogleplacesResult(postalCode, googleAPIkey)
                .then(function (GoogleplacesResult) {
                  let places = JSON.parse(GoogleplacesResult)
                  //make sure respose status is not ZERO_RESULTS
                  if (places.status === 'ZERO_RESULTS') {
                    console.log(`zip '${postalCode}' returned ${places.status} from google`)
                  } else {
                    updateTables(places, postalCodeArray, i, 'customer')
                  }
                })
                .catch(function (err) {
                  console.log(err)
                })
            }
          }
        }
        connection.release()
      })
    })
    .catch(function (err) {
      console.log(err)
    })

}

//MAIN expert 
exports.getExpertLocation = function (req, res) {
  db.get()
    .then(function (connection) {
      //get id and postalcodes from customer where location Id is null and postalCode is not null 
      connection.query(`SELECT userProfileID, postalCode FROM expert WHERE locationID is null AND postalCode is not null`, function (err, result) {
        if (err) {
          console.log(err)
        } else {
          let postalCodeArray = result
          
          //loop to get through all zips returned  
          for (let i = 0; i < postalCodeArray.length; i++) {
            let postalCode = postalCodeArray[i].postalCode

            //make sure postal code is vaild 
            if (postalCode.length < 5) {
              console.log(`'${postalCode}' is not a vail postalCode`)
            } else {
              // #3 populate url with zip code and google apiKey and save response
              getGoogleplacesResult(postalCode, googleAPIkey)
                .then(function (GoogleplacesResult) {
                  let places = JSON.parse(GoogleplacesResult)
                  //make sure respose status is not ZERO_RESULTS
                  if (places.status === 'ZERO_RESULTS') {
                    console.log(`zip '${postalCode}' returned ${places.status} from google`)
                  } else {
                    updateTables(places, postalCodeArray, i, 'expert')
                  }
                })
                .catch(function (err) {
                  console.log(err)
                })
            }
          }
        }
        connection.release()
      })
    })
    .catch(function (err) {
      console.log(err)
    })
}
