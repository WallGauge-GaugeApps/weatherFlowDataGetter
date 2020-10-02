const EventEmitter = require('events');
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
        precipLast7Days: undefined,
        precipLast14Days: undefined,
        precipLast28Days: undefined,
        precipMonth: undefined,
        precipYear: undefined
    }
};

const stationMeta = {
    publicName: undefined,
    latitude: undefined,
    longitude: undefined,
    stationID: undefined,
    deviceID: undefined
};

class weatherFlowDataGetter extends EventEmitter {

    /**
     * Weather data for the Tempest weather station based on the WeatherFlow Smart Weather API.
     * WeatherFlow API Documentation https://weatherflow.github.io/SmartWeather/api/.
     * 
     * This class emits:
     *  this.emit('ready') When the station meta data is acquired and ready to make request.
     *  this.emit('errorStationMetaData', err) If an error occurs in acquiring station meta data.
     * 
     * The target weather station ID and location (meta data) can be found in the "this.station" object. 
     * The fields in the station object are populated based on the account the user logged into when generating the apiKey (Personal Use Token).
     * 
     * Weather data can be found in the "this.data" object, all values are in imperial units.
     * 
     * @param {string} apiKey api key (Personal Use Token) from https://tempestwx.com/settings/tokens
     * @param {boolean} verboseLogging Defaults to false
     */
    constructor(apiKey = '', verboseLogging = false) {
        super();
        this.apiKey = apiKey;
        this.verbose = verboseLogging;
        this.data = weatherDataObj;
        this.station = stationMeta;

        this.getMetaData()
            .then((stationInfo) => {
                if (this.verbose) {
                    logit('Station meta data acquired for ' + this.station.publicName + ', follows:');
                    console.dir(stationInfo, { depth: null });
                };
                this.emit('ready');
            })
            .catch((err) => {
                logit('Error calling getMetaData during calss constuction!');
                this.emit('errorStationMetaData', err)
            });
    };

    /**
     * Gets current observation data for the this.station.deviceID from swd.weatherflow.com and populates this.data.current object.
     * When the promise is resolved you can find the parsed weather data in the this.data.current object.
     * The resolved promise argument will be a JSON object with native data (in metric units) from the /observations/device/{this.station.deviceID} api call as 
     * documented here https://weatherflow.github.io/SmartWeather/api/swagger/#!/observations/getObservationsByDeviceId
     * @returns {Promise} Resolved promise argument will be all data from the /observations/device/{this.station.deviceID} api call. 
     */
    getCurrent() {
        return new Promise((resolve, reject) => {
            if (this.station.deviceID == '') {
                reject('deviceID not Set')
            } else {
                let callObj = {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };
                let uri = baseApiURL + '/observations/?device_id=' + this.station.deviceID + '&api_key=' + this.apiKey;

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
                            this.data.obsDate = (new Date(pData.epoch)).toLocaleString()
                            this.data.current.temp = convertCelsiusToFahrenheit(pData.airTemp);
                            this.data.current.feelsLike = convertCelsiusToFahrenheit(pData.summary.feelsLike);
                            this.data.current.wind = convertMetersPerSecondToMilesPerHour(pData.windAvg);
                            this.data.current.windDegree = pData.windDirection;
                            this.data.current.windGust = convertMetersPerSecondToMilesPerHour(pData.windGust);
                            this.data.current.pressure = convertMillibarToInchOfMercury(pData.pressure);
                            this.data.current.precip = convertMillimeterToInch(pData.lclDayRainAccum);
                            this.data.current.humidity = pData.humidity;
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

    /**
     * Gets today's forecast based on Tempest weather station located at this.station.latitude, this.station.longitude and populates this.data.forecast object.
     * When the promise is resolved, the forecast data in this.data.forecast will be correct.
     * The resolved promise argument will be a very large JSON object with the native data from the /better_forecast api call.
     * This api endpoint is still under development and has not been documented.
     * @returns {Promise} Resolved promise argument will be all raw forecast data from the api call.
     */
    getForecast() {
        return new Promise((resolve, reject) => {
            if (this.station.deviceID == '') {
                reject('deviceID not Set')
            } else {
                let callObj = {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };
                let uri = baseApiURL + '/better_forecast?api_key=' + this.apiKey + '&lat=' + this.station.latitude + '&lon=' + this.station.longitude;

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
                            resolve(jsonData);
                        };
                    })
                    .catch(err => {
                        console.error('Error calling ' + uri, err);
                        reject(err);
                    });

            };
        });
    };

    /**
     * Gets weather history for one day based on the dateCode parameter and the device ID set in this.station.deviceID. 
     * The dateCode argument is the day in history to retrieve weather data. It is used to derive the time_start and time_end parameters of the /observations api endpoint 
     * as documented here https://weatherflow.github.io/SmartWeather/api/swagger/#!/observations/getObservationsByDeviceId.
     * @param {Date} dateCode a date object of the day in history to request weather data.
     * @returns {Promise} Resolved promise argument will be parsed JSON object of call results. 
     */
    getHistory(dateCode = new Date()) {
        return new Promise((resolve, reject) => {
            let endTime = new Date(dateCode.setHours(23, 59));
            let endEpoc = Math.round(endTime.getTime() / 1000);
            let startEpoc = endEpoc - 60
            if (this.verbose) {
                logit('Getting weather history for ' + dateCode.toDateString() + ', endEpoc = ' + endEpoc + ', startEpoc = ' + startEpoc);
            };
            if (this.station.deviceID == '') {
                reject('deviceID not Set')
            } else {
                let callObj = {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };
                let uri = baseApiURL + '/observations/?device_id=' + this.station.deviceID + '&api_key=' + this.apiKey + '&time_start=' + startEpoc + '&time_end=' + endEpoc;
                fetch(uri, callObj)
                    .then(res => res.json())
                    .then(jsonData => {
                        if (this.verbose) {
                            logit('getHistory Observation for ' + dateCode.toDateString());
                            console.dir(jsonData, { depth: null });
                        };
                        if (jsonData.status.status_code != 0) {
                            logit('API Error with getHistory:');
                            reject(jsonData.status.status_message);
                        } else {
                            let pData = parseObservation(jsonData);
                            if(this.verbose && pData.parseError != undefined) console.error('parse error in getHistory: ', pData.parseError)
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

    /**
     * Makes a call to the /stations api endpoint to read the meta data for the stationID associated with this.apiKey and populates this.station object based on results.
     * A station is a collection of devices. This method will read through all the devices associated with the stationID and set
     * this.station.deviceID based on the first device ID with device.device_type == 'ST'.
     * Documentation for this endpoint https://weatherflow.github.io/SmartWeather/api/swagger/#!/stations/getStations.
     * @returns {Promise} Resolved promise argument will be a JSON object of the results from call (all META data for the station).
     */
    getMetaData() {
        return new Promise((resolve, reject) => {
            if (this.apiKey == '') {
                reject('apiKey not passed to getMetaData method')
            } else {
                let callObj = {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };
                let uri = baseApiURL + '/stations/?api_key=' + this.apiKey;
                fetch(uri, callObj)
                    .then(res => res.json())
                    .then(jsonData => {
                        if (this.verbose) {
                            logit('getMetaData follows:');
                            console.dir(jsonData, { depth: null });
                        };
                        try {
                            this.station.publicName = jsonData.stations[0].public_name;
                            this.station.latitude = jsonData.stations[0].latitude;
                            this.station.longitude = jsonData.stations[0].longitude;
                            this.station.stationID = jsonData.stations[0].station_id;
                            let devices = jsonData.stations[0].devices;
                            if (Array.isArray(devices)) {
                                devices.forEach((device) => {
                                    if (device.device_type == 'ST') {
                                        this.station.deviceID = device.device_id;
                                    };
                                });;
                            }
                            resolve(this.station);
                        } catch (err) {
                            reject(err);
                        };
                    })
                    .catch(err => {
                        console.error('Error calling ' + uri, err);
                        reject(err);
                    });
            };
        });
    };

    /**
     * Updates history values in this.data.history object by calling:
     * getAccumulatedPrecipHistory(7), getAccumulatedPrecipHistory(14), getAccumulatedPrecipHistory(28), and getMonthPrecipHistory().
     * Call this method once a day to keep history up to date.
     * @returns {Promise} Resolved promise argument will be this.data.history 
     */
    updateAllHistoryValues() {
        return new Promise((resolve, reject) => {
            this.getAccumulatedPrecipHistory(7)
                .then((rslt) => {
                    if (this.verbose) logit('Setting 7 Day precip ' + rslt);
                    this.data.history.precipLast7Days = rslt;
                    return this.getAccumulatedPrecipHistory(14)
                })
                .then((rslt) => {
                    if (this.verbose) logit('Setting 14 Day precip ' + rslt);
                    this.data.history.precipLast14Days = rslt;
                    return this.getAccumulatedPrecipHistory(28)
                })
                .then((rslt) => {
                    if (this.verbose) logit('Setting 28 Day precip ' + rslt);
                    this.data.history.precipLast28Days = rslt;
                    return this.getAccumulatedPrecipHistory(getDaysIntoThisYear())
                })
                .then((rslt)=>{
                    if (this.verbose) logit('Setting yearly precip ' + rslt);
                    console.log('result from get years worth of rain = ' + rslt);
                    this.data.history.precipYear = rslt;                    
                    return this.getMonthPrecipHistory()
                })
                .then((rslt) => {
                    if (this.verbose) logit('Setting monthly precip ' + rslt);
                    this.data.history.precipMonth = rslt;
                    resolve(this.data.history);
                })
                .catch((err) => {
                    logit('Error getting History information');
                    reject(err);
                });
        });
    };

    /**
     * Calls getHistory repeatedly for the value passed in daysBack parameter to calculate the accumulated precipitation.
     * @param {number} daysBack Days in history to go back and fetch accumulated precipitation.
     * @returns {Promise} Resolved promise argument will be accumulated precipitation (in inches) for daysBack from today, as a number.
     */
    getAccumulatedPrecipHistory(daysBack = 7) {
        return new Promise((resolve, reject) => {
            let dayOfMonth = (new Date()).getDate();
            let promisesArray = []
            for (let index = 1; index <= daysBack; index++) {
                let dateCode = new Date((new Date()).setDate((new Date()).getDate() - index));
                promisesArray.push(this.getHistory(dateCode))
            }
            Promise.all(promisesArray)
                .then((values) => {
                    let totalPrecip = 0;

                    values.forEach((val) => {

                        if (this.verbose) console.log('The rain amount for ' + (new Date(val.epoch)).toDateString() + ', lclDayRainAccumFinal = ' + convertMillimeterToInch(val.lclDayRainAccumFinal) + ', lclDayRainAccum = ' + convertMillimeterToInch(val.lclDayRainAccum));
                        if (val.lclDayRainAccumFinal == null || val.lclDayRainAccumFinal == undefined) {
                            totalPrecip = totalPrecip + val.lclDayRainAccum;
                        } else {
                            totalPrecip = totalPrecip + val.lclDayRainAccumFinal;
                        }
                    });
                    totalPrecip = convertMillimeterToInch(totalPrecip);
                    resolve(totalPrecip);
                })
                .catch((err) => {
                    logit('Error with getPrecipHistory');
                    reject(err);
                })
        })
    };

    /**
     * Calls this.getHistory repeatedly for every day of the current month up to today to calculate the accumlated precipitation for this month.
     * @returns {Promise} Resolved promise argument will be accumulated precipitation (in inches) for the current month, as a number.
     */
    getMonthPrecipHistory() {
        return new Promise((resolve, reject) => {
            let dayOfMonth = (new Date()).getDate();
            let promisesArray = []
            for (let index = 1; index < dayOfMonth; index++) {
                let dateCode = new Date((new Date()).setDate((new Date()).getDate() - index));
                promisesArray.push(this.getHistory(dateCode))
            }
            Promise.all(promisesArray)
                .then((values) => {
                    let totalPrecip = 0;

                    values.forEach((val) => {

                        if (this.verbose) console.log('The rain amount for ' + (new Date(val.epoch)).toDateString() + ', lclDayRainAccumFinal = ' + convertMillimeterToInch(val.lclDayRainAccumFinal) + ', lclDayRainAccum = ' + convertMillimeterToInch(val.lclDayRainAccum));
                        if (val.lclDayRainAccumFinal == null || val.lclDayRainAccumFinal == undefined) {
                            totalPrecip = totalPrecip + val.lclDayRainAccum;
                        } else {
                            totalPrecip = totalPrecip + val.lclDayRainAccumFinal;
                        }
                    });
                    totalPrecip = convertMillimeterToInch(totalPrecip);
                    resolve(totalPrecip);
                })
                .catch((err) => {
                    logit('Error with getPrecipHistory');
                    reject(err);
                })
        })
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
        parseError: undefined,
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
        rainAccumFinal: 0,
        lclDayRainAccumFinal: 0,
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
            rtnObj.epoch = obs[0] * 1000
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
        // console.error('Error weatherFlowDataGetter parseObservation', err);
        rtnObj.parseError = err;
    };
    return rtnObj;
};

function getDaysIntoThisYear() {
    let now = new Date();
    let start = new Date(now.getFullYear(), 0, 0);
    let diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function logit(txt = '') {
    console.debug(logPrefix + txt);
};

module.exports = weatherFlowDataGetter