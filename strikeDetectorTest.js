const WAPI = require('./weatherFlowDataGetter');
const actObj = require('./actObj.json');

const wApi = new WAPI(actObj.apiKey, false);

const start = '8/08/20 06:00'
const end = '8/09/20 2:00'

// const start = '9/08/20 06:00'
// const end = '9/09/20 2:00'

let startDateObj = new Date(start)
let endDateObj = new Date(end);

wApi.on('ready', () => {
    console.log("Here is the station's meta data:");
    console.dir(wApi.station, { depth: null });

    let startEpoch = startDateObj.getTime() / 1000;
    let endEpoch = endDateObj.getTime() / 1000;

    console.log('Start  :' + startDateObj.toDateString() + ' ' + startDateObj.toLocaleTimeString() + ',\tepoch = ' + startEpoch);
    console.log('End    :' + endDateObj.toDateString() + ' ' + endDateObj.toLocaleTimeString() + ',\tepoch = ' + endEpoch);

    wApi.getHistoryRange(startEpoch, endEpoch)
        .then((rslt) => {
            console.log('Result:');
            let storm = []
            if (Array.isArray(rslt)) {
                rslt.forEach((val) => {
                    if (val.avgStrikeDistance > 0) {
                        let now = new Date();
                        now.setTime(val.epoch);
                        let distance = Math.round(val.avgStrikeDistance * 0.621371);
                        storm.push([distance, val.pressure, val.epoch]);
                        // console.log('Strike Distance ' + distance + ' miles, Strike Count ' + val.strikeCount + ', at ' + now.toLocaleTimeString());
                    }
                })
            };
            console.log('Storm array details [distance, pressure, time]:')
            console.dir(storm, { depth: null });
            // pressureAlgorithm(storm);
            overheadAlgorithm(storm);

        })

});

function overheadAlgorithm(storm = []){
    if (!Array.isArray(storm)) {
        console.warn('Error pressureAlgorithm strom must be an array.')
        return
    };
    console.log('Running simple change when storm is overhead algorithm');
    let closestPoint = 5;
    let stromWasOverhead = false;
    let stormTrend = 'approaching'

    storm.forEach((val, ndx) => {
        if (Array.isArray(val)) {
            let distance = Number(val[0]);
            let pressure = Number(val[1]);
            let time = new Date(val[2]);

            if(distance <= closestPoint && stromWasOverhead == false){
                console.log('Storm is now overhead')
                stormTrend = 'departing'
                stromWasOverhead = true;
            }
            console.log(distance + '\t' + pressure + '\t' + stormTrend + '\t' + time.toLocaleTimeString());
        }
    })
    

}

function pressureAlgorithm(storm = []) {
    if (!Array.isArray(storm)) {
        console.warn('Error pressureAlgorithm strom must be an array.')
        return
    };
    console.log('Running pressure algorithm');
    let lastPressure = 0;
    let stormsHighPressure = 0;
    let stormsLowPressure = 0;
    let stormTrend = 'approaching'


    storm.forEach((val, ndx) => {
        if (Array.isArray(val)) {
            let distance = Number(val[0]);
            let pressure = Number(val[1]);
            let time = new Date(val[2]);

            if (stormsLowPressure == 0 || pressure < stormsLowPressure) stormsLowPressure = pressure
            if (stormsHighPressure == 0 || pressure > stormsHighPressure) stormsHighPressure = pressure

            if (pressure >= stormsHighPressure) {
                stormTrend = 'approaching';
            } else {
                stormTrend = 'departing';
            };
            console.log(distance + '\t' + pressure + '\t' + stormTrend + '\t' + stormsLowPressure + '\t' + stormsHighPressure + '\t' + time.toLocaleTimeString());
        }
    })
};



function average(numbers = []) {
    let total = 0;
    let devider = 1;
    if (numbers.length <= 10) {
        numbers.forEach(val => {
            if (Array.isArray(val)) {
                val = val[0]
            }
            total += val;
        })
        devider = numbers.length
    } else {
        numbers.reverse().forEach((val, ndx) => {
            if (ndx <= 9) {
                total += val;
            }
        });
        devider = 10
    }
    return Math.round(total / devider);
}

let sampleObj = {
    parseError: undefined,
    epoch: 1596889860000,
    windLull: 0.67,
    windAvg: 1.23,
    windGust: 1.79,
    windDirection: 141,
    windInterval: 3,
    pressure: 1002.5,
    airTemp: 20.9,
    humidity: 88,
    lux: 15688,
    UV: 0.62,
    solarRadiation: 131,
    rainAccum: 0,
    precipType: 0,
    avgStrikeDistance: 0,
    strikeCount: 0,
    battery: 2.6,
    reptInterval: 1,
    lclDayRainAccum: 0,
    rainAccumFinal: 0,
    lclDayRainAccumFinal: 0,
    precipAnalysis: 1,
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
}