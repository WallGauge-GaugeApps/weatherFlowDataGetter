const fetch = require('node-fetch');

const logPrefix = 'weatherFlowDataGetter.js | ';
const baseApiURL = 'https://swd.weatherflow.com/swd/rest';
const weatherDataObj = {
    obsDate: undefined,
    current: {
        temp: undefined,
        feelsLike: undefined,
        wind: undefined,
        windGust: undefined,
        windDegree: undefined,
        pressure: undefined,
        precip: undefined,
        humidity: undefined
    },
    forecast: {
        maxTemp: undefined,
        minTemp: undefined,
        maxWind: undefined,
        totalPrecip: undefined,
        precipChance: undefined
    },
    history: {
        precipLast7Days: undefined
    }
};

class weatherFlowDataGetter {

    constructor(apiKey = '', deviceID = '', verboseLogging = false) {
        this.apiKey = apiKey;
        this.verbose = verboseLogging;
        this.data = weatherDataObj;
        this.deviceID = deviceID;
        this.lat = '39.15366';
        this.lon = '-90.31903';
        // this.stationID = '25682'
    };

    getCurrent() {
        return new Promise((resolve, reject) => {
            if (this.deviceID == '') {
                reject('deviceID not Set')
            } else {
                let callObj = {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };
                let uri = baseApiURL + '/observations/?device_id=' + this.deviceID + '&api_key=' + this.apiKey;

                fetch(uri, callObj)
                    .then(res => res.json())
                    .then(jsonData => {
                        if (this.verbose) {
                            logit('Current Weather Observation follows:');
                            console.dir(jsonData, { depth: null });
                        };
                        if (jsonData.error) {
                            logit('API Error with getCurrent:');
                            reject(jsonData.error);
                        } else {
                            let pData = parseObservation(jsonData);


                            this.data.obsDate = new Date(pData.epoch)
                            this.data.current.temp = convertCelsiusToFahrenheit(pData.airTemp);
                            this.data.current.feelsLike = convertCelsiusToFahrenheit(pData.summary.feelsLike);
                            this.data.current.wind = convertMetersPerSecondToMilesPerHour(pData.windAvg);
                            this.data.current.windDegree = pData.windDirection;
                            this.data.current.windGust = convertMetersPerSecondToMilesPerHour(pData.windGust);
                            this.data.current.pressure = convertMillibarToInchOfMercury(pData.pressure);
                            this.data.current.precip = convertMillimeterToInch(pData.lclDayRainAccum);
                            this.data.current.humidity = pData.humidity;

                            // this.data.forecast.maxTemp = jsonData.forecast.forecastday[0].day.maxtemp_f;
                            // this.data.forecast.minTemp = jsonData.forecast.forecastday[0].day.mintemp_f;
                            // this.data.forecast.maxWind = jsonData.forecast.forecastday[0].day.maxwind_mph;
                            // this.data.forecast.totalPrecip = jsonData.forecast.forecastday[0].day.totalprecip_in;
                            // this.data.forecast.rainChance = jsonData.forecast.forecastday[0].day.daily_chance_of_rain;
                            // this.data.forecast.snowChance = jsonData.forecast.forecastday[0].day.daily_chance_of_snow;




                            resolve(pData);
                        };
                    })
                    .catch(err => {
                        console.error('Error calling ' + uri, err);
                        reject(err);
                    });

            };
        });
    };

    getForecast() {
        return new Promise((resolve, reject) => {
            if (this.deviceID == '') {
                reject('deviceID not Set')
            } else {
                let callObj = {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };
                let uri = baseApiURL + '/better_forecast?api_key=' + this.apiKey + '&lat=' + this.lat + '&lon=' + this.lon;

                fetch(uri, callObj)
                    .then(res => res.json())
                    .then(jsonData => {
                        if (this.verbose) {
                            logit('Current Weather Forecast follows:');
                            console.dir(jsonData.forecast.daily[0], { depth: null });
                        };
                        if (jsonData.error) {
                            logit('API Error with getCurrent:');
                            reject(jsonData.error);
                        } else {
                            let fHighs = findForecastHighs(jsonData);
                            this.data.forecast.maxTemp = convertCelsiusToFahrenheit(jsonData.forecast.daily[0].air_temp_high);
                            this.data.forecast.minTemp = convertCelsiusToFahrenheit(jsonData.forecast.daily[0].air_temp_low);
                            this.data.forecast.maxWind = convertMetersPerSecondToMilesPerHour(fHighs.maxWind);
                            this.data.forecast.totalPrecip = convertMillimeterToInch(fHighs.totalPrecip);
                            this.data.forecast.precipChance = jsonData.forecast.daily[0].precip_probability;
                            resolve(jsonData.forecast.daily);
                        };
                    })
                    .catch(err => {
                        console.error('Error calling ' + uri, err);
                        reject(err);
                    });

            };
        });
    };
};

function convertCelsiusToFahrenheit(celsiusValue) {
    return Number(Number((celsiusValue * 9 / 5) + 32).toFixed(1));
}

function convertMetersPerSecondToMilesPerHour(mpsValue) {
    return Number(Number(mpsValue * 2.23694).toFixed(1));
}

function convertMillibarToInchOfMercury(mbValue) {
    return Number(Number(mbValue / 33.864).toFixed(3));
}

function convertMillimeterToInch(mmValue) {
    return Number(Number(mmValue / 25.4).toFixed(2));
}

function findForecastHighs(fcstObj = {}, dayToLookup = new Date()) {
    let rtnObj = {
        maxWind: undefined,
        totalPrecip: undefined,
    };
    let maxWind = 0;
    let totalPrecip = 0;
    try {
        let dayToQuery = dayToLookup.getDate();
        let fcObj = fcstObj.forecast.hourly;
        if (Array.isArray(fcObj)) {
            fcObj.forEach((hrObj) => {
                if (hrObj.local_day == dayToQuery) {
                    if (hrObj.wind_avg >= maxWind) maxWind = hrObj.wind_avg;
                    if (hrObj.precip >= totalPrecip) totalPrecip = hrObj.precip;
                };
            });
            rtnObj.maxWind = maxWind;
            rtnObj.totalPrecip = totalPrecip;
        }
    } catch (err) {
        console.error('Error weatherFlowDataGetter findForecastHighs', err);
    };
    return rtnObj;
};

function parseObservation(observation = {}) {
    let rtnObj = {
        epoch: undefined,
        windLull: undefined,
        windAvg: undefined,
        windGust: undefined,
        windDirection: undefined,
        windInterval: undefined,
        pressure: undefined,
        airTemp: undefined,
        humidity: undefined,
        lux: undefined,
        UV: undefined,
        solarRadiation: undefined,
        rainAccum: undefined,
        precipType: undefined,
        avgStrikeDistance: undefined,
        strikeCount: undefined,
        battery: undefined,
        reptInterval: undefined,
        lclDayRainAccum: undefined,
        rainAccumFinal: undefined,
        lclDayRainAccumFinal: undefined,
        precipAnalysis: undefined,
        summary: {
            pressureTrend: undefined,
            strikeCount1h: undefined,
            strikeCount3h: undefined,
            precipTotal1h: undefined,
            strikeLastDist: undefined,
            strikeLastEpoch: undefined,
            precipAccumLocalYesterday: undefined,
            feelsLike: undefined,
            heatIndex: undefined,
            windChill: undefined
        }
    };
    try {
        let obs = observation.obs[0]
        if (Array.isArray(obs)) {
            rtnObj.epoch = obs[0]
            rtnObj.windLull = obs[1]
            rtnObj.windAvg = obs[2]
            rtnObj.windGust = obs[3]
            rtnObj.windDirection = obs[4]
            rtnObj.windInterval = obs[5]
            rtnObj.pressure = obs[6]
            rtnObj.airTemp = obs[7]
            rtnObj.humidity = obs[8]
            rtnObj.lux = obs[9]
            rtnObj.UV = obs[10]
            rtnObj.solarRadiation = obs[11]
            rtnObj.rainAccum = obs[12]
            rtnObj.precipType = obs[13]
            rtnObj.avgStrikeDistance = obs[14]
            rtnObj.strikeCount = obs[15]
            rtnObj.battery = obs[16]
            rtnObj.reptInterval = obs[17]
            rtnObj.lclDayRainAccum = obs[18]
            rtnObj.rainAccumFinal = obs[19]
            rtnObj.lclDayRainAccumFinal = obs[20]
            rtnObj.precipAnalysis = obs[21]
        };

        if (observation.summary) {
            rtnObj.summary.pressureTrend = observation.summary.pressure_trend
            rtnObj.summary.strikeCount1h = observation.summary.strike_count_1h
            rtnObj.summary.strikeCount3h = observation.summary.strike_count_3h
            rtnObj.summary.precipTotal1h = observation.summary.precip_total_1h
            rtnObj.summary.strikeLastDist = observation.summary.strike_last_dist
            rtnObj.summary.strikeLastEpoch = observation.summary.strike_last_epoch
            rtnObj.summary.precipAccumLocalYesterday = observation.summary.precip_accum_local_yesterday
            rtnObj.summary.feelsLike = observation.summary.feels_like
            rtnObj.summary.heatIndex = observation.summary.heat_index
            rtnObj.summary.windChill = observation.summary.wind_chill
        }
    } catch (err) {
        console.error('Error weatherFlowDataGetter parseObservation', err);
    };
    return rtnObj;
};

function logit(txt = '') {
    console.debug(logPrefix + txt);
};

module.exports = weatherFlowDataGetter