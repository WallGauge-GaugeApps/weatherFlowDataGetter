# weatherFlowDataGetter (Tempest weather station data getter for WallGauge.com)

This class pulls weather information from the [WeatherFlow Smart Weather API](https://weatherflow.github.io/SmartWeather/api/#object-model), an API for accessing your Tempest weather station data (Air and Sky weather stations also supported).

[<img src="https://cdn.shopify.com/s/files/1/0012/8512/8294/files/Tempest_Hub_Mount_shopify-amazon-whats-in-box-tabs.png?v=1588185214" alt="alt text" width="640px">](https://shop.weatherflow.com/collections/frontpage/products/tempest)

## Software Requirements for this class

* Node v10 or newer
* git
* Go to [tempestwx.com/settings/tokens](https://tempestwx.com/settings/tokens) and login with your tempest account (same one you created when you installed your Tempest weather station) and click on Create Token.

## To install

* `git clone https://github.com/WallGauge-GaugeApps/weatherFlowDataGetter.git`
* `cd weatherFlowDataGetter`
* `npm install`

### To Test

* Paste your API key (personal use token) you generated above into actObj.json file:
  * `cd ~/weatherFlowDataGetter`
  * Type `nano actObj.json` to create a file and paste this into it: `{"apiKey":"youKeyHere"}` update with your information and save.
* To run test type: `node testMe` from the `cd ~/weatherFlowDataGetter` directory.

## Notes

* For examples on how to call this class see [testMe.js](https://github.com/WallGauge-GaugeApps/weatherFlowDataGetter/blob/master/testMe.js)
* Make sure you create a personal access token with the same credentials you used to install your tempest weather station.  The personal access token is used to find your station ID and location.
  * If you use a generic access token (development token) you will need to call [getMetaData('stationID')](https://github.com/WallGauge-GaugeApps/weatherFlowDataGetter/blob/bc1e1d0b16a23586f3334073d3595a1b57675b81/weatherFlowDataGetter.js#L245) with the stationID you would like to query. This will look for the station META data based on the stationID instead of relying on the personal access token to set the stationID. testMe.js has an example of how to make this call in the [errorStationMetaData](https://github.com/WallGauge-GaugeApps/weatherFlowDataGetter/blob/ddad38b9be54a0aa5c79ed343afaddea779cefb4/testMe.js#L22) event consumer.

## This class will parse the weather data into the following data object

```
{
  obsDate: '10/2/2020, 2:28:35 PM', // Observation time the data was entered into the weatherFlow cloud
  current: {                        // call getCurrent() to update
    temp: 56.8,                     // temp is the current temperature in Fahrenheit
    feelsLike: 56.8,                // calculated by weatherFlow cloud
    wind: 4,                        // wind speed in miles per hour
    windGust: 7.5,                  // wind gust in miles per hour
    windDegree: 266,                // wind direction in degrees
    pressure: 29.595,               // pressure in HG (inches of Mercury)
    precip: 0,                      // precipitation in inches
    humidity: 44                    // Relative Humidity (%)
  },
  forecast: {                       // call getForecast() to update. This is the forecast for today.
    maxTemp: 60.8,                  // forecasted maximum temperature in Fahrenheit for today.
    minTemp: 41,                    // forecasted minimum temperature in Fahrenheit for today.
    maxWind: 8.9,                   // forecasted max wind sustained wind speed in miles per hour for today.
    totalPrecip: 0,                 // forecasted precipitation in inches for today.
    precipChance: 10                // chance (%) of precipitation for today.
  },
  history: {                        // call updateAllHistoryValues() to update.  See Missing Data Note.
    precipLast7Days: 0.52,          // Total accumulated precipitation for the last 7 days in inches.
    precipLast14Days: 0.52,         // Total accumulated precipitation for the last 14 days in inches.
    precipLast28Days: 2.55,         // Total accumulated precipitation for the last 28 days in inches.
    precipMonth: 0,                 // Total accumulated precipitation for the current month.
    precipYear: 6.99                // Total accumulated precipitation for the current year.
  }
}
```

Missing Data Note:  If history data is missing the updateAllHistoryValues() method will still return accumulated values of the data that is present. In other words, if your new Tempest weather station has only been reporting data for 3 months the precipYear will only show a total for 3 months of precipitation.
