const WAPI = require('./weatherFlowDataGetter');
const actObj = require('./actObj.json');

const wApi = new WAPI(actObj.apiKey, false);

wApi.on('ready', () => {
    console.log('Weather Flow Data Getter clase construction complete.  Getting all precip history...')
    wApi.updateAllHistoryValues()
        .then((rslt) => {
            console.log('History call complete.  Getting current conditions...');
            return wApi.getCurrent()
        })
        .then((rslt) => {
            console.log('Get current complete. Now requesting forecast...');
            return wApi.getForecast()
        })
        .then((rslt) => {
            console.log("\nStation details follow:");
            console.dir(wApi.station, {depth:null});
            console.log("\nWeather data follows:");
            console.dir(wApi.data, { depth: null });
        })
        .catch((err) => {
            console.error('Error calling wApi:', err);
        })

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
    console.log('Error initializing weaterFlowDataGetter class.  Is your API Key correct?');
    console.error('Error initializing weaterFlowDataGetter class', err);
});
