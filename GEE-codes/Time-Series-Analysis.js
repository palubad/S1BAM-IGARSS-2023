var Oly_geometry = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[21.458133205617063, 37.74797921043348],
          [21.458133205617063, 37.600152715543224],
          [21.91337917729675, 37.600152715543224],
          [21.91337917729675, 37.74797921043348]]], null, false),
    evia_geometry = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[23.122129452028535, 39.05932301569821],
          [23.122129452028535, 38.678682048995924],
          [23.498411190309785, 38.678682048995924],
          [23.498411190309785, 39.05932301569821]]], null, false),
    athens_geometry = 
    /* color: #98ff00 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[23.74517928446036, 38.23905210135975],
          [23.74517928446036, 38.086265672591296],
          [23.90722762430411, 38.086265672591296],
          [23.90722762430411, 38.23905210135975]]], null, false),
    olympia_first = /* color: #d63000 */ee.Geometry.Polygon(
        [[[21.560100063527262, 37.70631845517042],
          [21.580012783253824, 37.67860784469641],
          [21.616404995167887, 37.662302648727426],
          [21.642497524464762, 37.669368673494],
          [21.637004360402262, 37.70251565118925],
          [21.575206264699137, 37.71012106404211]]]),
    evia_first = 
    /* color: #98ff00 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[23.41807366589636, 38.93230671538392],
          [23.434552969336764, 38.94485507535091],
          [23.427686703005737, 38.95260090100322],
          [23.401928399697987, 38.96089681944335],
          [23.289670955935424, 38.93390909912637],
          [23.255466758893366, 38.91012656432346],
          [23.239160003028832, 38.86068422889929],
          [23.216199886599487, 38.82272475625474],
          [23.231273519857517, 38.801223087844285],
          [23.26007139739426, 38.78185701288813],
          [23.29430399959686, 38.76345490221797],
          [23.31902323787811, 38.7864735270302],
          [23.361215889487053, 38.813767439029206],
          [23.398634601202314, 38.82340122744336],
          [23.457038984948422, 38.84585935251606]]]),
    athens_first = 
    /* color: #0b4a8b */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[23.402387688149258, 38.14139541722352],
          [23.37286193131332, 38.151115474378635],
          [23.311750481118008, 38.155975017274514],
          [23.270551750649258, 38.1273530483506],
          [23.269178459633633, 38.11114695789091],
          [23.29046447037582, 38.09115449324646],
          [23.313123772133633, 38.100340899517725],
          [23.34814269303207, 38.09439688613584],
          [23.34539611100082, 38.081426451590715],
          [23.363248894203945, 38.07656194535709],
          [23.391401360024258, 38.08088596687805],
          [23.409254143227383, 38.09601802864156],
          [23.39208800553207, 38.10520382358177],
          [23.344022819985195, 38.12573260115973],
          [23.399641106118008, 38.13275427920331]]]),
    athens_result = ee.Image("users/danielp/IGARSS_2023/S1BAM_IGARSS_results_FINAL_Athens"),
    results_evia = ee.Image("users/danielp/IGARSS_2023/S1BAM_IGARSS_results_FINAL_Evia"),
    olympia_result = ee.Image("users/danielp/IGARSS_2023/S1BAM_IGARSS_results_FINAL_Olympia");

var evia = evia_geometry;
var olympia = Oly_geometry;
var athens = ee.FeatureCollection('users/danielp/S1BAM_selected_geometry_athens2').first().geometry();


//*******************************************************************************************
//                            SELECT AN AREA OF INTEREST AND REFENCE POINT

// Set your selected area as geometry
var geometry = evia;
var orbitNumber =7; // Evia and Athens 7, Olympia 80

// Select dates
// var selectedDate = '2021-08-13';
var fireStartDate = '2021-08-03';
var fireEndDate = '2021-08-19';
var startDate = '2021-01-01';
var endDate = '2021-11-21';

Map.centerObject(geometry, 11);

// Load JRC Global Surface Water database for masking out water areas
var JRC = ee.Image('JRC/GSW1_3/GlobalSurfaceWater');
var waterMask = JRC.select('occurrence').gt(10).unmask().eq(0).clip(geometry);

// Load GPM precipitation data
var GPM = ee.ImageCollection('NASA/GPM_L3/IMERG_V06').select('precipitationCal');

// Create image collections from image bands
var theFunction = require('users/danielp/functions:bandsToImgCollection');
var evia_r = theFunction.bandsToImgCollection(results_evia).first().rename('result');
var olympia_r = theFunction.bandsToImgCollection(olympia_result).first().rename('result');
var athens_r = theFunction.bandsToImgCollection(athens_result).first().rename('result');

// if the geoemtry is set to the pre-selected option, select its corresponding classification result
// and the reference area
if (geometry == evia) {
  var result_img = evia_r;
  var randomReference = evia_first;
}

if (geometry == olympia) {
  var result_img = olympia_r;
  var randomReference = olympia_first;
}

if (geometry == athens) {
  var result_img = athens_r;
  var randomReference = athens_first;
}

Map.addLayer(ee.Image(result_img),{},'Result of the first clustering')


//*******************************************************************************************
//                            CREATE SAR POLARIMETRIC INDICES

// convert power units to dB
var indices_then_powerToDb = function powerToDb (img){
  
  var RVI = (ee.Image(4).multiply(img.select('VH')))
            .divide(img.select('VV').add(img.select('VH'))).rename('RVI');
  var RFDI = (img.select('VV').subtract(img.select('VH')))
              .divide(img.select('VV').add(img.select('VH'))).rename('RFDI');

  return ee.Image(10).multiply(img.log10())
        .addBands([RVI])
        .addBands([RFDI])
        .copyProperties(img,img.propertyNames());
};

// Add precipitation data from GPM
var addPrecipitation = function addPrecipitation(img) {
  var timeOfSensing = img.get('system:time_start')
  var filteredPrecipitation = GPM.filterDate(ee.Date(timeOfSensing).advance(-12,'hour'),ee.Date(timeOfSensing)).sum().rename('precipitation')
  return img.addBands([filteredPrecipitation.clip(geometry)]).copyProperties(img,img.propertyNames())
}

// Make mosaics from overlapping tiles
var theFunction = require('users/danielp/functions:makeMosaicsFromOverlappingTiles_function');

// apply the function
var images = theFunction.makeMosaicsFromOverlappingTiles(images,geometry);

// generate 500 random points
var randomPoints = ee.FeatureCollection.randomPoints(randomReference, 500);

// create buffer around these random points
var buffered = randomPoints.map(function(feature) {
            return feature.buffer(20);
        });

// select only areas 
var calculatedPoints = images.sort('system:time_start').select(['VH','VV','RVI','RFDI','precipitation']).map(function(img){
  return img
  // add if it is burned or not
  .addBands(result_img)
  // add time band
  .addBands(ee.Image(ee.Number(img.get('system:time_start'))).rename('time'))
  .updateMask(waterMask)
  .reduceRegions({
            collection: buffered,
            reducer: ee.Reducer.mean(),
            scale: 20,
        });
});

var TS = calculatedPoints.map(function(fCollection){
  
  var date = ee.String(fCollection.get('system:index')).slice(17,-46)
            .cat('-')
            .cat(ee.String(fCollection.get('system:index')).slice(21,-44))
            .cat('-')
            .cat(ee.String(fCollection.get('system:index')).slice(23,-42))
  
  // Filter out points, which have Null values for any of the properties
  var notNULLs = ee.FeatureCollection(fCollection).filter(ee.Filter.notNull(['VH', 'VV', 'RVI']));
  
  var burned = ee.FeatureCollection(notNULLs).filter(ee.Filter.eq('result',1));
  var unburned = ee.FeatureCollection(notNULLs).filter(ee.Filter.eq('sum',0));

  // Functions to create arrays containing all the values (LIA, VH and VV) of selected points
  var BurnedmeanVV = burned.aggregate_mean('VV');
  var BurnedmeanVH = burned.aggregate_mean('VH');
  var BurnedmeanRVI = burned.aggregate_mean('RVI');
  var BurnedmeanRFDI = burned.aggregate_mean('RFDI');
  var preci = burned.aggregate_mean('precipitation');

  var BurnedVV = burned.aggregate_array('VV');
  var BurnedVH = burned.aggregate_array('VH');
  var BurnedRVI = burned.aggregate_array('RVI');
  var BurnedRFDI = burned.aggregate_array('RFDI');
  
  // Calculate statistics for Tukey's fences
  var perc75VV = ee.Number(BurnedVV.reduce(ee.Reducer.percentile([75])));
  var perc25VV = ee.Number(BurnedVV.reduce(ee.Reducer.percentile([25])));
  var IQRVV = perc75VV.subtract(perc25VV);
  var lowerFenceVV = perc25VV.subtract(ee.Number(1.5).multiply(IQRVV));
  var upperFenceVV = perc75VV.add(ee.Number(1.5).multiply(IQRVV));
  var perc75VH = ee.Number(BurnedVH.reduce(ee.Reducer.percentile([75])));
  var perc25VH = ee.Number(BurnedVH.reduce(ee.Reducer.percentile([25])));
  var IQRVH = perc75VH.subtract(perc25VH);
  var lowerFenceVH = perc25VH.subtract(ee.Number(1.5).multiply(IQRVH));
  var upperFenceVH = perc75VH.add(ee.Number(1.5).multiply(IQRVH));
  var perc75RVI = ee.Number(BurnedRVI.reduce(ee.Reducer.percentile([75])));
  var perc25RVI = ee.Number(BurnedRVI.reduce(ee.Reducer.percentile([25])));
  var perc75RFDI = ee.Number(BurnedRFDI.reduce(ee.Reducer.percentile([75])));
  var perc25RFDI = ee.Number(BurnedRFDI.reduce(ee.Reducer.percentile([25])));
  
  var burnedStats = ee.Feature(null, {'VH_p75_Burned':perc75VH, 
                                      'VH_mean_Burned':BurnedmeanVH,
                                      'VH_p25_Burned':perc25VH,
                                      'VV_p75_Burned':perc75VV, 
                                      'VV_mean_Burned':BurnedmeanVV,
                                      'VV_p25_Burned':perc25VV,
                                      'RVI_p75_Burned':perc75RVI, 
                                      'RVI_mean_Burned':BurnedmeanRVI,
                                      'RFDI_mean_Burned': BurnedmeanRFDI,
                                      'RVI_p25_Burned':perc25RVI,
                                      'RFDI_p75_Burned':perc75RFDI, 
                                      'RFDI_p25_Burned':perc25RFDI,
                                      'precipitation': preci,
                                      'status':'burned',
                                      'time': burned.aggregate_mean('time'),
                                      'date': date
  })
  .set('system:time_start',burned.aggregate_mean('time'))
  
  return burnedStats.set('NumberOfBurnedAreas',burned.aggregate_count('VH')).set('NumberOfUnburnedAreas',unburned.aggregate_count('VH'));

})


TS = TS.filter(ee.Filter.notNull(['VH_mean_Burned'])).sort('time')

print('Number of burned areas included in the analysis',TS.aggregate_mean('NumberOfBurnedAreas'))

// Define the chart and print it to the console.
var chart_with_all = ui.Chart.feature
                .byFeature({
                  features: TS,
                  yProperties : [
                    'VH_p75_Burned','VH_p25_Burned','VH_mean_Burned', 'VV_p75_Burned','VV_p25_Burned','VV_mean_Burned',
                  'precipitation',
                  'RVI_p75_Burned','RVI_p25_Burned','RVI_mean_Burned',
                  'RFDI_p75_Burned','RFDI_p25_Burned', 'RFDI_mean_Burned'
                  ],
                  xProperty : 'date'
                })
                .setChartType('ScatterChart')
                .setOptions({lineSize:1,pointSize: 0,interpolateNulls: true,curveType: 'function',
                  series: {
    0: {lineWidth: 2, color: 'E37D05', pointSize: 0, lineDashStyle: [4, 4]},
    1: {lineWidth: 2, color: '#add8e6', lineDashStyle: [4, 4]},
    3: {lineWidth: 0.5, color: '#add8e6', pointSize: 0, lineDashStyle: [4, 4]},
    4: {lineWidth: 0.5, color: '#add8e6', lineDashStyle: [4, 4]},
  }
  });

print('Chart with all variables (good for export)', chart_with_all);

// Define the chart and print it to the console.
var RVIchart = ui.Chart.feature
                .byFeature({
                  features: TS,
                  yProperties : ['RVI_p75_Burned','RVI_p25_Burned','RVI_mean_Burned',
                  ],
                  xProperty : 'date'
                })
                .setChartType('ScatterChart')
                .setOptions({lineSize:1,pointSize: 0,interpolateNulls: true,curveType: 'function',
                title: 'RVI mean with 25th and 75th percentiles',
                  series: {
    0: {lineWidth: 0.5, color: 'E37D05', pointSize: 0, lineDashStyle: [4, 4]},
    1: {lineWidth: 0.5, color: 'E37D05', lineDashStyle: [4, 4]},
    3: {lineWidth: 0.5, color: '#add8e6', pointSize: 0, lineDashStyle: [4, 4]},
    4: {lineWidth: 0.5, color: '#add8e6', lineDashStyle: [4, 4]},
  }
  });

print('RVI mean with 25th and 75th percentiles', RVIchart);


// Export time series as CSV
Export.table.toDrive({collection:TS, description: 'Exported time series'});
