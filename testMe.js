const WAPI = require('./weatherFlowDataGetter');
const actObj = require('./actObj.json');

const wApi = new WAPI(actObj.apiKey, false);

wApi.on('ready', () => {
    console.log("Here is the station's meta data:");
    console.dir(wApi.station, { depth: null });
    getAllWxData();
    setInterval(() => {
        wApi.getCurrent()
            .then((rslt) => {
                console.dir(wApi.data, { depth: null })
            })
            .catch((err) => {
                console.error('Error getting weather data from weatherFlowDataGetter', err);
            });
    }, 60000 * 15)
});

wApi.on('errorStationMetaData', (err) => {
    console.log('Error looking up station META data based on api Key.  Lets try setting wApi.station manually...');
    wApi.getMetaData('25682') //WallGauge HQ
        .then((reslt) => {
            console.log('Success:')
            console.dir(reslt);
            getAllWxData();
        })
        .catch((err) => {
            console.error('Error trying to override station ID:', err)
        });
});

function getAllWxData() {
    console.log('Getting current conditons for ' + wApi.station.publicName)
    wApi.getCurrent()
        .then((rslt) => {
            console.log('Get current complete. Observation Date = ' + wApi.data.obsDate);
            console.dir(wApi.data.current, { depth: null });
            console.log('Here is the lightning information:')
            console.dir(wApi.data.lightning, { depth: null });
            console.log('Getting Forecast...')
            return wApi.getForecast()
        })
        .then((rslt) => {
            console.log("Get forecast complete:");
            console.dir(wApi.data.forecast, { depth: null });
            console.log('Getting all rain history....');
            return wApi.updateAllHistoryValues()
        })
        .then((rslt) => {
            console.log('Get rain history complete:');
            console.dir(wApi.data.history, { depth: null })
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
        })
}