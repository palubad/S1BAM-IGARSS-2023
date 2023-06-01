//============================================================
//                ***********************
//                      USER PART
//                ***********************
//============================================================
//  Select the area of interest, speckle filters and its
//   window sizes to test, post-filter and polarization
//============================================================

// Set your selected area as geometry [String] for predefined or ee.Geometry object for your own data
//  predefined strings: 'athens', 'olympia', 'evia'
var geometry = 'evia';

// Select speckle filter to test [String]
// available options: 'leefilter', 'refinedLee', 'leesigma', 'gammamap'
var speckleList = ['refinedLee'];

// Select speckle filter widonw kernel sizes [Integers, e.g. 3,5,7,9, etc.]
var kernel_sizes = [3,5,7,9,11,13,15];

// Decide if do post-filtering of the results. Options: 'yes' or 'no'
var do_post_filtering = 'yes';
// If yes, set the size of post-classification filter to use (in hectares) [Integer], otherwise set the default value
var post_filter_size = 2;

// Set the CRS in EPSG [String]
var crs = 'EPSG:32634';

// Select polarization filter [String]
// available options: 'ALL' (using both VV and VH polarizations), 'VH' (use only VH), 'VV' (use only VV)
var pol_filter = 'VH';


//============================================================
//                     SET THE TIME FRAME
//============================================================

// For Sentinel-1 SAR data
//  selectedDate: selected for the analysis - based on least cloud cover and temporal proximity to a Sentinel-2 acquisition
var selectedDate = '2021-08-24';
var fireStartDate = '2021-08-16';
var fireEndDate = '2021-08-25';
var startDate = '2021-01-01';

// For Sentinel-2 pre-fire image (least cloud coverage)
var prefire_start = '2021-08-15';   
var prefire_end = '2021-08-17';

// For Sentinel-2 post-fire image (least cloud coverage and proximity to a Sentinel-2 acquisition)
var postfire_start = '2021-08-26';
var postfire_end = '2021-08-27';




//============================================================
//                ***********************
//                     ANALYSIS PART
//                ***********************
//============================================================

// Predefined geometries
var evia = ee.Geometry.Polygon(
        [[[23.122129452028535, 39.05932301569821],
          [23.122129452028535, 38.678682048995924],
          [23.498411190309785, 38.678682048995924],
          [23.498411190309785, 39.05932301569821]]], null, false),
    
    olympia = ee.Geometry.Polygon(
        [[[21.458133205617063, 37.74797921043348],
          [21.458133205617063, 37.600152715543224],
          [21.91337917729675, 37.600152715543224],
          [21.91337917729675, 37.74797921043348]]], null, false);

var athens = ee.Geometry.Polygon(
        [[[23.232708909670883, 38.201434900967364],
          [23.232708909670883, 38.04721776511313],
          [23.459130265872055, 38.04721776511313],
          [23.459130265872055, 38.201434900967364]]], null, false);

// Predefined dates
if (geometry == 'athens') {
  geometry = athens;
  // For Sentinel-1 SAR data
  var selectedDate = '2021-08-24';
  var fireStartDate = '2021-08-16';
  var fireEndDate = '2021-08-25';
  var startDate = '2021-01-01';
  
  // For Sentinel-2 optical data
  var prefire_start = '2021-08-15';   
  var prefire_end = '2021-08-17';
  // Now set the same parameters S2 post-fire image
  var postfire_start = '2021-08-26';
  var postfire_end = '2021-08-27';
}
if (geometry == 'olympia') {
  geometry = olympia;
  // For Sentinel-1 SAR data
  var selectedDate = '2021-08-17';
  var fireStartDate = '2021-08-04';
  var fireEndDate = '2021-08-19';
  var startDate = '2021-01-01';
  
  // For Sentinel-2 optical data
  var prefire_start = '2021-08-20';   
  var prefire_end = '2021-08-30'; 
  // Now set the same parameters S2 post-fire image
  var postfire_start = '2021-08-16';
  var postfire_end = '2021-08-19';
}
if (geometry == 'evia') {
  geometry = evia;
  // For Sentinel-1 SAR data
  var selectedDate = '2021-08-18';
  var fireStartDate = '2021-08-03';
  var fireEndDate = '2021-08-19';
  var startDate = '2021-01-01';
  
  // For Sentinel-2 optical data
  var prefire_start = '2021-08-20';   
  var prefire_end = '2021-08-30';
  // Now set the same parameters S2 post-fire image
  var postfire_start = '2021-08-18';
  var postfire_end = '2021-08-19';
}

// Add the predefined geometry to the map
print(geometry)
Map.addLayer(athens, {}, 'Selected geometry');

// calculations for the post-classification filter
// FocalSize = radius of the 2x Minimap Mapping Unit (post_filter_size) area 
var connected = ee.Number(post_filter_size).multiply(10000).divide(400);
var focalSize = ee.Number(post_filter_size).multiply(10000).multiply(2).pow(0.5).divide(2);
var unit = "meters";

print(connected,focalSize);

  // Post Filter Settings
  // connected                     13 = 0.5 ha,   25 = 1 ha,    50 = 2ha,   125 = 5ha,   250 for 10ha
  // focalSize = 2xconnected area. 50 for 0.5 ha, 71 for 1 ha, 100 for 2ha, 160 for 5ha, 224 for 10ha

// Function to filter out small areas
function postFilter(img) {

  // count patch sizes
  var patchsize = img.connectedPixelCount(connected, false);
  
  // run a majority filter --> this was used for training
  var filtered50 = img.focalMode(focalSize, "square", unit);
  
  // updated image with majority filter where patch size is small
  var filteredBinaryCluster1 =  img.where(patchsize.lt(connected).unmask(),filtered50).rename('cluster');
  // Map.addLayer((binaryCluster),{},'cascade1')
  
  // SECOND filter to delete areas smaller than 200 pixels (2 ha)
  var patchsize2 = filteredBinaryCluster1.connectedPixelCount(connected, false);
  
  // run a majority filter --> this was used for training
  var filtered = filteredBinaryCluster1.focalMode(focalSize, "square", unit);
  
  // updated image with majority filter where patch size is small
  var filteredBinaryCluster2 =  filteredBinaryCluster1.where(patchsize2.lt(connected),filtered).rename('cluster');
  
  return filteredBinaryCluster2
}  
//*******************************************************************************************
//                            CREATE SAR POLARIMETRIC INDICES

Map.centerObject(geometry, 11);

Map.addLayer(ee.ImageCollection("COPERNICUS/S2_SR")
.filterBounds(geometry)
.filterDate(postfire_start,ee.Date(postfire_start).advance(1,'day')).sort('system:time_start',false).mosaic(), 
{min:0, max:3000, bands:['B12','B11', 'B8']}, 
'S-2 Atmospheric penetration composite [B12-B11-B9]')

// calculate RVI, RFDI and DPSVI
var indices = function(img) {
  var RVI = (ee.Image(4).multiply(img.select('VH')))
            .divide(img.select('VV').add(img.select('VH'))).rename('RVI');
  var ratio = img.select('VH').divide(img.select('VV')).rename('ratio');
  var RFDI = (img.select('VV').subtract(img.select('VH')))
              .divide(img.select('VV').add(img.select('VH'))).rename('RFDI');
  return img.addBands([RVI,ratio,RFDI]).copyProperties(img,img.propertyNames());
};

// convert power units to dB
var powerToDb = function powerToDb (img){
  return ee.Image(10).multiply(img.log10()).copyProperties(img,img.propertyNames());
};


var s1 = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT')
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filterBounds(geometry)
    .filterDate(startDate, fireEndDate );

print('Available S-1 images', s1);


// call the prepared function to merge overlapping images over the ROI
var theFunction = require('users/danielp/functions:makeMosaicsFromOverlappingTiles_function');
// apply the function
var finalCollection = theFunction.makeMosaicsFromOverlappingTiles(s1,geometry);



var SpeckleTuning = function(speckle_filter){
  var KERNEL_SIZE = kernel_sizes
  
  
  // var KERNEL_SIZE = 11
  // var filter = [50,100,150,200]
  
  
  // var filter = 150
  // var results = filter.map(function(filter) {
  var results = KERNEL_SIZE.map(function(KERNEL_SIZE) {

  // KERNEL_SIZE = ee.Number.parse(KERNEL_SIZE);
  
  // filters adopted from https://github.com/adugnag/gee_s1_ard/blob/main/javascript/speckle_filter.js
var refinedLee = function (image) {
//---------------------------------------------------------------------------//
// Refined Lee filter 
//---------------------------------------------------------------------------//
/** This filter is modified from the implementation by Guido Lemoine 
 * Source: Lemoine et al.; https://code.earthengine.google.com/5d1ed0a0f0417f098fdfd2fa137c3d0c */
    var bandNames = image.bandNames().remove('angle');
  
    var result = ee.ImageCollection(bandNames.map(function(b){
    var img = image.select([b]);
    
    // img must be linear, i.e. not in dB!
    // Set up 3x3 kernels 
    var weights3 = ee.List.repeat(ee.List.repeat(1,3),3);
    var kernel3 = ee.Kernel.fixed(3,3, weights3, 1, 1, false);
  
    var mean3 = img.reduceNeighborhood(ee.Reducer.mean(), kernel3);
    var variance3 = img.reduceNeighborhood(ee.Reducer.variance(), kernel3);
  
    // Use a sample of the 3x3 windows inside a 7x7 windows to determine gradients and directions
    var sample_weights = ee.List([[0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0], [0,1,0,1,0,1,0], [0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0]]);
  
    var sample_kernel = ee.Kernel.fixed(7,7, sample_weights, 3,3, false);
  
    // Calculate mean and variance for the sampled windows and store as 9 bands
    var sample_mean = mean3.neighborhoodToBands(sample_kernel); 
    var sample_var = variance3.neighborhoodToBands(sample_kernel);
  
    // Determine the 4 gradients for the sampled windows
    var gradients = sample_mean.select(1).subtract(sample_mean.select(7)).abs();
    gradients = gradients.addBands(sample_mean.select(6).subtract(sample_mean.select(2)).abs());
    gradients = gradients.addBands(sample_mean.select(3).subtract(sample_mean.select(5)).abs());
    gradients = gradients.addBands(sample_mean.select(0).subtract(sample_mean.select(8)).abs());
  
    // And find the maximum gradient amongst gradient bands
    var max_gradient = gradients.reduce(ee.Reducer.max());
  
    // Create a mask for band pixels that are the maximum gradient
    var gradmask = gradients.eq(max_gradient);
  
    // duplicate gradmask bands: each gradient represents 2 directions
    gradmask = gradmask.addBands(gradmask);
  
    // Determine the 8 directions
    var directions = sample_mean.select(1).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(7))).multiply(1);
    directions = directions.addBands(sample_mean.select(6).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(2))).multiply(2));
    directions = directions.addBands(sample_mean.select(3).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(5))).multiply(3));
    directions = directions.addBands(sample_mean.select(0).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(8))).multiply(4));
    // The next 4 are the not() of the previous 4
    directions = directions.addBands(directions.select(0).not().multiply(5));
    directions = directions.addBands(directions.select(1).not().multiply(6));
    directions = directions.addBands(directions.select(2).not().multiply(7));
    directions = directions.addBands(directions.select(3).not().multiply(8));
  
    // Mask all values that are not 1-8
    directions = directions.updateMask(gradmask);
  
    // "collapse" the stack into a singe band image (due to masking, each pixel has just one value (1-8) in it's directional band, and is otherwise masked)
    directions = directions.reduce(ee.Reducer.sum());  
  
    //var pal = ['ffffff','ff0000','ffff00', '00ff00', '00ffff', '0000ff', 'ff00ff', '000000'];
    //Map.addLayer(directions.reduce(ee.Reducer.sum()), {min:1, max:8, palette: pal}, 'Directions', false);
  
    var sample_stats = sample_var.divide(sample_mean.multiply(sample_mean));
  
    // Calculate localNoiseVariance
    var sigmaV = sample_stats.toArray().arraySort().arraySlice(0,0,5).arrayReduce(ee.Reducer.mean(), [0]);
  
    // Set up the 7*7 kernels for directional statistics
    var rect_weights = ee.List.repeat(ee.List.repeat(0,7),3).cat(ee.List.repeat(ee.List.repeat(1,7),4));
  
    var diag_weights = ee.List([[1,0,0,0,0,0,0], [1,1,0,0,0,0,0], [1,1,1,0,0,0,0], 
      [1,1,1,1,0,0,0], [1,1,1,1,1,0,0], [1,1,1,1,1,1,0], [1,1,1,1,1,1,1]]);
  
    var rect_kernel = ee.Kernel.fixed(7,7, rect_weights, 3, 3, false);
    var diag_kernel = ee.Kernel.fixed(7,7, diag_weights, 3, 3, false);
  
    // Create stacks for mean and variance using the original kernels. Mask with relevant direction.
    var dir_mean = img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel).updateMask(directions.eq(1));
    var dir_var = img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel).updateMask(directions.eq(1));
  
    dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel).updateMask(directions.eq(2)));
    dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel).updateMask(directions.eq(2)));
  
    // and add the bands for rotated kernels
    for (var i=1; i<4; i++) {
      dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
      dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
      dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
      dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
    }
  
    // "collapse" the stack into a single band image (due to masking, each pixel has just one value in it's directional band, and is otherwise masked)
    dir_mean = dir_mean.reduce(ee.Reducer.sum());
    dir_var = dir_var.reduce(ee.Reducer.sum());
  
    // A finally generate the filtered value
    var varX = dir_var.subtract(dir_mean.multiply(dir_mean).multiply(sigmaV)).divide(sigmaV.add(1.0));
  
    var b = varX.divide(dir_var);
  
    return dir_mean.add(b.multiply(img.subtract(dir_mean)))
      .arrayProject([0])
      // Get a multi-band image bands.
      .arrayFlatten([['sum']])
      .float();
  })).toBands().rename(bandNames).copyProperties(image,image.propertyNames());
  return image.addBands(result, null, true) 
  } 

var leesigma = function(image) {
  //---------------------------------------------------------------------------//
// Improved Lee Sigma filter 
//---------------------------------------------------------------------------//
/** Implements the improved lee sigma filter to one image. 
It is implemented as described in, Lee, J.-S.; Wen, J.-H.; Ainsworth, T.L.; Chen, K.-S.; Chen, A.J. Improved sigma filter for speckle filtering of SAR imagery. 
IEEE Trans. Geosci. Remote Sens. 2009, 47, 202–213. */

        //parameters
        var KERNEL = KERNEL_SIZE;
        var Tk = ee.Image.constant(7); //number of bright pixels in a 3x3 window
        var sigma = 0.9;
        var enl = 4;
        var target_kernel = 3;
        var bandNames = image.bandNames().remove('angle');
  
        //compute the 98 percentile intensity 
        var z98 = image.select(bandNames).reduceRegion({
                reducer: ee.Reducer.percentile([98]),
                geometry: image.geometry(),
                scale:10,
                maxPixels:1e13
            }).toImage();
            
        //select the strong scatterers to retain
        var brightPixel = image.select(bandNames).gte(z98);
        var K = brightPixel.reduceNeighborhood({reducer: ee.Reducer.countDistinctNonNull()
                            ,kernel: ee.Kernel.square((target_kernel/2) ,'pixels')}); 
        var retainPixel = K.gte(Tk);
  
  
        //compute the a-priori mean within a 3x3 local window
        //original noise standard deviation
        var eta = 1.0/Math.sqrt(enl);
        eta = ee.Image.constant(eta);
        //MMSE applied to estimate the a-priori mean
        var reducers = ee.Reducer.mean().combine({
                      reducer2: ee.Reducer.variance(),
                      sharedInputs: true
                      });
        var stats = image.select(bandNames).reduceNeighborhood({reducer: reducers,kernel: ee.Kernel.square(target_kernel/2,'pixels'), optimization: 'window'})
        var meanBand = bandNames.map(function(bandName){return ee.String(bandName).cat('_mean')});
        var varBand = bandNames.map(function(bandName){return ee.String(bandName).cat('_variance')});
        var z_bar = stats.select(meanBand);
        var varz = stats.select(varBand);
        
        var oneImg = ee.Image.constant(1);
        var varx = (varz.subtract(z_bar.abs().pow(2).multiply(eta.pow(2)))).divide(oneImg.add(eta.pow(2)));
        var b = varx.divide(varz);
        var xTilde = oneImg.subtract(b).multiply(z_bar.abs()).add(b.multiply(image.select(bandNames)));
  
        //step 3: compute the sigma range
        // Lookup table (J.S.Lee et al 2009) for range and eta values for intensity (only 4 look is shown here)
        var LUT = ee.Dictionary({0.5: ee.Dictionary({'I1': 0.694,'I2': 1.385,'eta': 0.1921}),
                                 0.6: ee.Dictionary({'I1': 0.630,'I2': 1.495,'eta': 0.2348}),
                                 0.7: ee.Dictionary({'I1': 0.560,'I2': 1.627,'eta': 0.2825}),
                                 0.8: ee.Dictionary({'I1': 0.480,'I2': 1.804,'eta': 0.3354}),
                                 0.9: ee.Dictionary({'I1': 0.378,'I2': 2.094,'eta': 0.3991}),
                                 0.95: ee.Dictionary({'I1': 0.302,'I2': 2.360,'eta': 0.4391})});
  
        // extract data from lookup
        var sigmaImage = ee.Dictionary(LUT.get(String(sigma))).toImage();
        var I1 = sigmaImage.select('I1');
        var I2 = sigmaImage.select('I2');
        //new speckle sigma
        var nEta = sigmaImage.select('eta');
        //establish the sigma ranges
        I1 = I1.multiply(xTilde);
        I2 = I2.multiply(xTilde);
  
        //step 3: apply the minimum mean square error (MMSE) filter for pixels in the sigma range
        // MMSE estimator
        var mask = image.select(bandNames).gte(I1).or(image.select(bandNames).lte(I2));
        var z = image.select(bandNames).updateMask(mask);

        stats = z.reduceNeighborhood({reducer: reducers,kernel: ee.Kernel.square(KERNEL/2,'pixels'), optimization: 'window'})

        z_bar = stats.select(meanBand);
        varz = stats.select(varBand);
        
        varx = (varz.subtract(z_bar.abs().pow(2).multiply(nEta.pow(2)))).divide(oneImg.add(nEta.pow(2)));
        b = varx.divide(varz);
        //if b is negative set it to zero
        var new_b = b.where(b.lt(0), 0);
        var xHat = oneImg.subtract(new_b).multiply(z_bar.abs()).add(new_b.multiply(z));
  
        // remove the applied masks and merge the retained pixels and the filtered pixels
        xHat = image.select(bandNames).updateMask(retainPixel).unmask(xHat);
        var output = ee.Image(xHat).rename(bandNames);
  return image.addBands(output, null, true);
} 

var gammamap =  function(image) { 
  //---------------------------------------------------------------------------//
// GAMMA MAP filter 
//---------------------------------------------------------------------------//
/** Gamma Maximum a-posterior Filter applied to one image. It is implemented as described in 
Lopes A., Nezry, E., Touzi, R., and Laur, H., 1990.  Maximum A Posteriori Speckle Filtering and First Order texture Models in SAR Images.  
International  Geoscience  and  Remote  Sensing  Symposium (IGARSS).  */
        var enl = 5;
        var bandNames = image.bandNames().remove('angle');
        //Neighbourhood stats
        var reducers = ee.Reducer.mean().combine({
                      reducer2: ee.Reducer.stdDev(),
                      sharedInputs: true
                      });
        var stats = image.select(bandNames).reduceNeighborhood({reducer: reducers,kernel: ee.Kernel.square(KERNEL_SIZE/2,'pixels'), optimization: 'window'})
        var meanBand = bandNames.map(function(bandName){return ee.String(bandName).cat('_mean')});
        var stdDevBand = bandNames.map(function(bandName){return ee.String(bandName).cat('_stdDev')});
        
        var z = stats.select(meanBand);
        var sigz = stats.select(stdDevBand);
        
        // local observed coefficient of variation
        var ci = sigz.divide(z);
        // noise coefficient of variation (or noise sigma)
        var cu = 1.0/Math.sqrt(enl);
        // threshold for the observed coefficient of variation
        var cmax = Math.sqrt(2.0) * cu
  
        cu = ee.Image.constant(cu);
        cmax = ee.Image.constant(cmax);
        var enlImg = ee.Image.constant(enl);
        var oneImg = ee.Image.constant(1);
        var twoImg = ee.Image.constant(2);
  
        var alpha = oneImg.add(cu.pow(2)).divide(ci.pow(2).subtract(cu.pow(2)));

        //Implements the Gamma MAP filter described in equation 11 in Lopez et al. 1990
        var q = image.select(bandNames).expression("z**2 * (z * alpha - enl - 1)**2 + 4 * alpha * enl * b() * z", {z: z, alpha: alpha,enl: enl})
        var rHat = z.multiply(alpha.subtract(enlImg).subtract(oneImg)).add(q.sqrt()).divide(twoImg.multiply(alpha));
  
        //if ci <= cu then its a homogenous region ->> boxcar filter
        var zHat = (z.updateMask(ci.lte(cu))).rename(bandNames)
        //if cmax > ci > cu then its a textured medium ->> apply Gamma MAP filter
        rHat = (rHat.updateMask(ci.gt(cu)).updateMask(ci.lt(cmax))).rename(bandNames)
        //if ci>=cmax then its strong signal ->> retain
        var x = image.select(bandNames).updateMask(ci.gte(cmax)).rename(bandNames)
  
        // Merge
        var output = ee.ImageCollection([zHat,rHat,x]).sum();
        return image.addBands(output, null, true);
  }   

var leefilter = function(image) {
//---------------------------------------------------------------------------//
// Lee filter 
//---------------------------------------------------------------------------//
/** Lee Filter applied to one image. It is implemented as described in 
 J. S. Lee, “Digital image enhancement and noise filtering by use of local statistics,” 
 IEEE Pattern Anal. Machine Intell., vol. PAMI-2, pp. 165–168, Mar. 1980.*/
 
        var bandNames = image.bandNames().remove('angle');
        //S1-GRD images are multilooked 5 times in range
        var enl = 5
        // Compute the speckle standard deviation
        var eta = 1.0/Math.sqrt(enl); 
        eta = ee.Image.constant(eta);

        // MMSE estimator
        // Neighbourhood mean and variance
        var oneImg = ee.Image.constant(1);

        var reducers = ee.Reducer.mean().combine({
                      reducer2: ee.Reducer.variance(),
                      sharedInputs: true
                      });
        var stats = image.select(bandNames).reduceNeighborhood({reducer: reducers,kernel: ee.Kernel.square(KERNEL_SIZE/2,'pixels'), optimization: 'window'})
        var meanBand = bandNames.map(function(bandName){return ee.String(bandName).cat('_mean')});
        var varBand = bandNames.map(function(bandName){return ee.String(bandName).cat('_variance')});
        
        var z_bar = stats.select(meanBand);
        var varz = stats.select(varBand);

        // Estimate weight 
        var varx = (varz.subtract(z_bar.pow(2).multiply(eta.pow(2)))).divide(oneImg.add(eta.pow(2)));
        var b = varx.divide(varz);
  
        //if b is negative set it to zero
        var new_b = b.where(b.lt(0), 0)
        var output = oneImg.subtract(new_b).multiply(z_bar.abs()).add(new_b.multiply(image.select(bandNames)));
        output = output.rename(bandNames);
        return image.addBands(output, null, true);
  }   

  
  // Speckle filter selection
  // var speckleFilter = leefilter
  
  if (speckle_filter == 'leefilter') {
    var speckleFilter = leefilter;
  }
  if (speckle_filter == 'leesigma') {
    var speckleFilter = leesigma;
  }
  if (speckle_filter == 'gammamap') {
    var speckleFilter = gammamap;
  }
  if (speckle_filter == 'refinedLee') {
    var speckleFilter = refinedLee;
  }

// Add indices and use speckle filter
var S1Collection = ee.ImageCollection(finalCollection)
                    .map(speckleFilter)
                    .map(indices).sort('system:time_start');

// prepare the post-fire image collection
var post_fire_images = S1Collection.filterDate(fireStartDate, fireEndDate ).map(powerToDb);

// load JRC Global Surface Water database for masking out water areas
var JRC = ee.Image('JRC/GSW1_3/GlobalSurfaceWater');
var waterMask = JRC.select('occurrence').gt(10).unmask().eq(0).clip(geometry);

// *****************************************
// ********** Visualisation check

var postImage = post_fire_images.sort('system:time_start',false).first()
  var satellite = postImage.get('platform_number');
  var path = ee.Number.parse(postImage.get('relativeOrbitNumber_start'));
  var orbit = postImage.get('orbitProperties_pass');

  var pre_TS_collection = S1Collection
                        .filterDate(startDate, fireStartDate)
                        .filter(ee.Filter.eq('platform_number', satellite))
                        .filter(ee.Filter.eq('relativeOrbitNumber_start', path))
                        .filter(ee.Filter.eq('orbitProperties_pass', orbit))
                        .map(powerToDb).sort('system:time_start')

var preImage = pre_TS_collection
                .filterDate(ee.Date(fireStartDate).advance(-1,'month'), fireStartDate)
                .median();

var MT_RGB_SW = ee.Image.cat(preImage.rename("preVV", "preVH", "preAngle",'RVI'),postImage.rename("postVV", "postVH", "postAngle",'RVI2'));

// Map.addLayer(MT_RGB_SW, {bands: ["postVH", "preVH", "preVH"], min: -25, max: -5}, "MT_RGB_SW_VH: post-pre-pre",0);
// Map.addLayer(MT_RGB_SW, {bands: ["preVH", "postVH", "postVH"], min: -25, max: -5}, "MT_RGB_SW_VH: pre-post-post",0);

//******************************************************************** //
// *************** THE MAIN FUNCTION *********************************//


var imagePreparation = function (img) {
  var postImage = img;

  var satellite = postImage.get('platform_number');
  var path = ee.Number.parse(postImage.get('relativeOrbitNumber_start'));
  var orbit = postImage.get('orbitProperties_pass');
  
  // long-term time series collection - create only pre-fire TS collection 
  var pre_TS_collection = S1Collection
                        .filterDate(startDate, fireStartDate)
                        .filter(ee.Filter.eq('platform_number', satellite))
                        .filter(ee.Filter.eq('relativeOrbitNumber_start', path))
                        .filter(ee.Filter.eq('orbitProperties_pass', orbit))
                        .map(powerToDb);

  // create median composite from images acquired one month before fire started
  var preImage = pre_TS_collection
                .filterDate(ee.Date(fireStartDate).advance(-1,'month'), fireStartDate)
                .median();

  // create statistics images
  var median = pre_TS_collection.reduce(ee.Reducer.median(),16)//.clip(geometry);
  var variance = pre_TS_collection.reduce(ee.Reducer.sampleVariance()).clip(geometry);
  var stdDev = pre_TS_collection.reduce(ee.Reducer.sampleStdDev(),16)//.clip(geometry);
  
  var diffRVI = postImage.select('RVI').subtract(preImage.select('RVI'));
  var diffRatio = postImage.select('ratio').subtract(preImage.select('ratio'));
  var diffRFDI = postImage.select('RFDI').subtract(preImage.select('RFDI'));
  
  // calculate the log-ratio image
  var logRatio_VH = postImage.select('VH').subtract(preImage.select('VH'));
  var logRatio_VV = postImage.select('VV').subtract(preImage.select('VV'));

  // calculate the k-map
  var kmap_VH = (logRatio_VH.abs().divide(stdDev.select('VH_stdDev'))).rename('changeVH');
  var kmap_VV = (logRatio_VV.abs().divide(stdDev.select('VV_stdDev'))).rename('changeVV');
  
  // create an image for classification
  var forClass = ee.Image.cat( 
                              // diffRVI.rename('diffRVI'), 
                              // diffRatio.rename('diffRatio')
                              kmap_VH.rename('kmap_VH'),
                              // variance.select('VH_variance').rename('VH_variance'),
                              logRatio_VH.rename('logRatio_VH'),
                              // stdDev.select('VH_stdDev').rename('stdDev_VH'), 
                              // median.select('VH_median').rename('median_VH'),
                              // logRatio_VV.rename('logRatio_VV'),
                              // stdDev.select('VV_stdDev').rename('stdDev_VV'),
                              // median.select('VV_median').rename('median_VV'),
                              // kmap_VV.rename('kmap_VV')
                              diffRatio.rename('diffRFDI')
                              ).updateMask(waterMask);
  
  // select indices to use
  if (pol_filter == 'VH') {
    pol_filter = ee.Filter.or(
                    ee.Filter.stringContains('item','VH'),
                    ee.Filter.stringContains('item','RVI'),
                    ee.Filter.stringContains('item','RFDI')
                    );
  }
  
  if (pol_filter == 'VV') {
    pol_filter = ee.Filter.or(
                      ee.Filter.stringContains('item','VV'),
                      ee.Filter.stringContains('item','RVI'),
                    ee.Filter.stringContains('item','RFDI')
                    );
  }
  
  if (pol_filter == 'ALL') {
    pol_filter = ee.Filter.or(
                      ee.Filter.stringContains('item','VH'),
                      ee.Filter.stringContains('item','RVI'),
                      ee.Filter.stringContains('item','VV'),
                    ee.Filter.stringContains('item','RFDI')
                    );
  }
  
  var pol_selection = forClass.bandNames().filter(pol_filter);
                    
  forClass = forClass.select(ee.List(pol_selection));

  return forClass.set('system:time_start',img.get('system:time_start'))
                  .set('system:index',img.get('system:index'));
  
  };
  
  var classification = function (img) {
  
    // Train with 10 000 pixels
    var training = img.sample({
      region: geometry,
      scale: 20,
      numPixels: 10000,
      seed: 0,
      tileScale: 16
    });
  
    // K-means with farthest first initialisation
    var clusterer = ee.Clusterer.wekaKMeans({
                    nClusters: 2,
                    distanceFunction: 'Manhattan',
                    init: 3,
                    }).train(training);
                
    // Cluster the input using the trained clusterer.
    var clusterResult = img.cluster(clusterer);
    
    // Generate the mode value from the reference region and convert it to ee.Number
    var mode_fromRegion = clusterResult.reduceRegion({
            geometry: geometry,
            reducer: ee.Reducer.mode(),
            scale: 20,
            tileScale: 16
          });
  
    // Set fire cluster where the most common value (mode) was found
    var fire_cluster = ee.Number.parse(mode_fromRegion.get("cluster"));
    
    
    // Select cluster corresponding to the fire event
    var binaryCluster = clusterResult.eq(fire_cluster).rename([img.get('system:index')]);
    
    // apply post filter
    var postFiltered = postFilter(binaryCluster);
    
    // condition regarding post-filtering what to export
    if (do_post_filtering == 'yes') {
      var final_img = postFiltered
    }
    
    if (do_post_filtering == 'no') {
      var final_img = binaryCluster
    }
    
    return final_img.set('system:index',img.get('system:index'));
  };
  
  
  
  var preparedImages = post_fire_images.sort('system:time_start')
                        .map(imagePreparation);
  
  var selected_image = preparedImages.filterDate(selectedDate,ee.Date(selectedDate).advance(1,'day')).sort('system:time_start',true).first();
  
  
  // Apply classifications for each image
  var unsup_results = classification(selected_image);
  
  
  return unsup_results.eq(0).unmask().rename(ee.String(speckle_filter).cat(ee.String('_postFilter_')).cat(ee.String(ee.Number(post_filter_size).format())));
  
  });
  return results;
};

var final = speckleList.map(SpeckleTuning);

var oneImage = ee.ImageCollection(ee.List(final).flatten()).toBands()

print(oneImage)


/////////////////////////////////// S2 ////////////////////////////
//===========================================================================================
//             BURN SEVERITY MAPPING USING THE NORMALIZED BURN RATIO (NBR)
//===========================================================================================
// Normalized Burn Ratio will be applied to imagery from before and after a wild fire. By
// calculating the difference afterwards (dNBR) Burn Severity is derived, showing the spatial
// impact of the disturbance. Imagery used in this process comes from Sentinel-2.
//===========================================================================================


//*******************************************************************************************
//                            SELECT AN AREA OF INTEREST

var area = geometry


//*******************************************************************************************
//                            SELECTING THE TILE OF INTEREST
if (area == evia) {
  var tile = ['34SFJ','34SGJ', '34SGH'];
}
if (area == olympia) {
  var tile = ['34SEG'];
} 
if (area == athens) {
  var tile = ['34SFH','34SGH'];
} 

//*******************************************************************************************
//                            SELECT THE SATELLITE PLATFORM


// Print Satellite platform and dates to console
var ImCol = 'COPERNICUS/S2_SR';

Map.addLayer(ee.ImageCollection("COPERNICUS/S2_SR")
.filterBounds(area)
.filterDate(postfire_start,ee.Date(postfire_start).advance(1,'day')).mosaic(), 
            {min:0, max:3000, bands:['B4','B3', 'B2']}, 'Sentinel-2 RGB')


//*******************************************************************************************
//                            DEFINE FUNCTIONS FOR CLOUD MASKING

var CLOUD_FILTER = 100
var CLD_PRB_THRESH = 30
var NIR_DRK_THRESH = 0.15
var CLD_PRJ_DIST = 1
var BUFFER = 50


function add_cloud_bands(img) {
    // # Get s2cloudless image, subset the probability band.
    var cld_prb = ee.Image(img.get('s2cloudless')).select('probability')

    // # Condition s2cloudless by the probability threshold value.
    var is_cloud = cld_prb.gt(CLD_PRB_THRESH).rename('clouds')

    // # Add the cloud probability layer and cloud mask as image bands.
    return img.addBands(ee.Image([cld_prb, is_cloud]))
}


function add_shadow_bands(img) {
    // # Identify water pixels from the SCL band.
    var not_water = img.select('SCL').neq(6)

    // # Identify dark NIR pixels that are not water (potential cloud shadow pixels).
    var SR_BAND_SCALE = 1e4
    var dark_pixels = img.select('B8').lt(NIR_DRK_THRESH*SR_BAND_SCALE).multiply(not_water).rename('dark_pixels')

    // # Determine the direction to project cloud shadow from clouds (assumes UTM projection).
    var shadow_azimuth = ee.Number(90).subtract(ee.Number(img.get('MEAN_SOLAR_AZIMUTH_ANGLE')));

    // # Project shadows from clouds for the distance specified by the CLD_PRJ_DIST input.
    var cld_proj = (img.select('clouds').directionalDistanceTransform(shadow_azimuth, CLD_PRJ_DIST*10)
        .reproject({'crs': img.select(0).projection(), 'scale': 100})
        .select('distance')
        .mask()
        .rename('cloud_transform'))

    // # Identify the intersection of dark pixels with cloud shadow projection.
    var shadows = cld_proj.multiply(dark_pixels).rename('shadows')

    // # Add dark pixels, cloud projection, and identified shadows as image bands.
    return img.addBands(ee.Image([dark_pixels, cld_proj, shadows]))
}


function add_cld_shdw_mask(img) {
    // # Add cloud component bands.
    var img_cloud = add_cloud_bands(img)

    // # Add cloud shadow component bands.
    var img_cloud_shadow = add_shadow_bands(img_cloud)

    // # Combine cloud and shadow mask, set cloud and shadow as value 1, else 0.
    var is_cld_shdw = img_cloud_shadow.select('clouds').add(img_cloud_shadow.select('shadows')).gt(0)

    // # Remove small cloud-shadow patches and dilate remaining pixels by BUFFER input.
    // # 20 m scale is for speed, and assumes clouds don't require 10 m precision.
    is_cld_shdw = (is_cld_shdw.focal_min(2).focal_max(BUFFER*2/20)
        .reproject({'crs': img.select([0]).projection(), 'scale': 20})
        .rename('cloudmask'))

    // # Add the final cloud-shadow mask to the image.
    return img_cloud_shadow.addBands(is_cld_shdw)
}



function apply_cld_shdw_mask(img) {
    // # Subset the cloudmask band and invert it so clouds/shadow are 0, else 1.
    var not_cld_shdw = img.select('cloudmask').not()

    // # Subset reflectance bands and update their masks, return the result.
    return img.select('B.*').updateMask(not_cld_shdw)
}

//var s2_sr_cld_col = get_s2_sr_cld_col(AOI, START_DATE, END_DATE)



//-------------------- Select the first post image recursively -----------------------

var imagery = ee.ImageCollection(ImCol);

var postfire_coll = ee.ImageCollection(imagery
    // Filter by dates.
    .filterDate(postfire_start, postfire_end)
    .filter(ee.Filter.inList('MGRS_TILE',tile))
    // Filter by location.
    .filterBounds(area))
    .distinct('system:time_start')
print(postfire_coll)
    
var datess = ee.List(postfire_coll.aggregate_array('system:time_start'))

var make_datelist = function(n) {
  return ee.Date(n).format('YYYY-MM-dd');
};

var dates = datess.map(make_datelist).distinct();
print(dates);

// load JRC Global Surface Water database for masking out
var JRC = ee.Image('JRC/GSW1_3/GlobalSurfaceWater');
var waterMask = JRC.select('occurrence').gt(10).unmask().eq(0);

//*******************************************************************************************
//*******************************************************************************************
//                            DEFINE THE PROCESSING FUNCTION
//*******************************************************************************************
//*******************************************************************************************
  
  var fun = function(d1) {

    
    var startina = ee.Date(d1);
    var pref_date = ee.Date(prefire_end)
    


  //----------------------- Select imagery by time and location -----------------------
  

  
  // In the following lines imagery will be collected in an ImageCollection, depending on the
  // location of our study area, a given time frame and the ratio of cloud cover.
  var prefireImCol = ee.ImageCollection(imagery
      // Filter by dates.
      .filterDate(prefire_start, pref_date)
      .filter(ee.Filter.inList('MGRS_TILE',tile))
      // Filter by location.
      .filterBounds(area));
      
  // # Import and filter s2cloudless.
  var prefire_cloudless_col = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
      // Filter by dates.
      .filterDate(prefire_start, pref_date)
      //.filter(ee.Filter.inList('MGRS_TILE',tile))
      // Filter by location.
      .filterBounds(area)

      
      // # Join the filtered s2cloudless collection to the SR collection by the 'system:index' property.
  var prefireImColl =  ee.ImageCollection(ee.Join.saveFirst('s2cloudless').apply({
        'primary': prefireImCol,
        'secondary': prefire_cloudless_col,
        'condition': ee.Filter.equals({
            'leftField': 'system:index',
            'rightField': 'system:index'
        })
    }))

      
  // Select all images that overlap with the study area from a given time frame 
  // As a post-fire state we select the 25th of February 2017
  var postfireImCol = ee.ImageCollection(imagery
      // Filter by dates.
      .filterDate(startina, postfire_end)
      .filter(ee.Filter.inList('MGRS_TILE',tile))
      // Filter by location.
      .filterBounds(area));
      
  // # Import and filter s2cloudless.
  var postfire_cloudless_col = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
      // Filter by dates.
      .filterDate(startina, postfire_end)
      //.filter(ee.Filter.inList('MGRS_TILE',tile))
      // Filter by location.
      .filterBounds(area)


      // # Join the filtered s2cloudless collection to the SR collection by the 'system:index' property.
  var postfireImColl =  ee.ImageCollection(ee.Join.saveFirst('s2cloudless').apply({
        'primary': postfireImCol,
        'secondary': postfire_cloudless_col,
        'condition': ee.Filter.equals({
            'leftField': 'system:index',
            'rightField': 'system:index'
        })
    }))


      
  
  //------------------------------- Apply a cloud and snow mask -------------------------------
  
    
  var prefireImCol = (prefireImColl.map(add_cld_shdw_mask)
                             .map(apply_cld_shdw_mask)
                             
                          
  )
  var postfireImCol = (postfireImColl.map(add_cld_shdw_mask)
                           .map(apply_cld_shdw_mask)
                           
  )                         

  var last_pre = prefireImCol.limit(1, 'system:time_start',false).first()
  var last_date_pre = ee.String(last_pre.get('system:index')).slice(0, 8)
  var last_pre_date = ee.Date.parse('YYYYMMdd', last_date_pre);
  var prefireImCol = prefireImCol.filter(ee.Filter.date(last_pre_date, last_pre_date.advance(1,'days')));
  
  var first_post = postfireImCol.limit(1, 'system:time_start').first()
  var first_date_post = ee.String(first_post.get('system:index')).slice(0, 8)
  var first_post_date = ee.Date.parse('YYYYMMdd', first_date_post);
  var postfireImCol = postfireImCol.filter(ee.Filter.date(first_post_date, first_post_date.advance(1,'days')));
  
  var prefire_CM_ImCol = prefireImCol
  var postfire_CM_ImCol = postfireImCol
  
  
  //----------------------- Mosaic and clip images to study area -----------------------------
  
  if (area == evia || area == athens) {
    
    var pre_mos = prefireImCol.mosaic().clip(area);
    var post_mos = postfireImCol.mosaic().clip(area);
    var pre_cm_mos = prefire_CM_ImCol.mosaic().clip(area);
    var post_cm_mos = postfire_CM_ImCol.mosaic().clip(area);
  } else {
    var pre_mos = prefireImCol.first().clip(area);
    var post_mos = postfireImCol.first().clip(area);
    var pre_cm_mos = prefire_CM_ImCol.first().clip(area);
    var post_cm_mos = postfire_CM_ImCol.first().clip(area);
  }


  
  
  //------------------ Calculate NBR for pre- and post-fire images ---------------------------
  
  // Apply platform-specific NBR = (NIR-SWIR2) / (NIR+SWIR2)
  
  var preNBR = pre_cm_mos.normalizedDifference(['B8', 'B12']);
  var postNBR = post_cm_mos.normalizedDifference(['B8', 'B12']);
  
  
  
  //------------------ Calculate difference between pre- and post-fire images ----------------
  
  // The result is called delta NBR or dNBR
  var dNBR_unscaled = preNBR.subtract(postNBR);
  
  // Scale product to USGS standards
  var dNBR = dNBR_unscaled.multiply(1000);
  

  //------------------------- Burn Ratio Product - Classification ----------------------------

  // Seperate result into 8 burn severity classes
  var thresholds = ee.Image([-1000, -251, -101, 99, 269, 439, 659, 2000]);
  var classified = dNBR.lt(thresholds).reduce('sum').toInt();
  
  //==========================================================================================
  //                      BINARY IMAGE GENERATION FUNCTION
  // + do the water masking
  
  var binary_dnbr = function(cnr) {
   var singleMask =  classified.mask(waterMask).updateMask(classified.lte(cnr));  // mask a single class
   return singleMask
  };
  

  //==========================================================================================
  //                     SET A THRESHOLD and CREATE THE BINARY IMAGE
  
  //  0   |      1        |            2           |           3           |       4      |    5     |
  //      |               |                        |                       |              |          |
  //  NA  | High Severity | Moderate-high Severity | Moderate-low Severity | Low Severity | Unburned | 
  // -------------------------------------------------------------------------------------------------
  //      |            6           |            7            |
  //      |                        |                         |
  //      | Enhanced Regrowth, Low | Enhanced Regrowth, High |
  //      ----------------------------------------------------
  
  var burnt_area = binary_dnbr(2); //select 0 to the input class number
  
  
  
//==========================================================================================
//               STORE THE FINAL PRODUCTS IN A LIST AND EXPORT THEM 
 
  var stringa = ee.String(last_pre_date.format('YYYYMMdd')).cat('_').cat(ee.String(startina.format('YYYYMMdd')));
  burnt_area = burnt_area.set('id',stringa);
  burnt_area = burnt_area.set('id1',ee.String(startina.format('YYYY-MM-dd')));
  burnt_area = burnt_area.set('id2',ee.String(dates.get(-1)));
  
  var ba = ee.Image(burnt_area);

  // change to dNBR to get all dNBR values not only the mask
  return burnt_area;
  };

var vis = {bands: ['B4', 'B3', 'B2'], max: 2000, gamma: 1.5};
var filtered = dates.map(fun);
print(filtered);

// Add validation to the map
Map.addLayer(ee.Image(ee.List(filtered.get(0))), {}, 'Burned Area based on Sentinel-2 dNBR index');

// create binary validation map
var validation = ee.Image(ee.List(filtered.get(0))).gt(0).unmask();


// updated image with majority filter where patch size is small
var postFilteredValidation = postFilter(validation);

// condition regarding post-filtering what to export
if (do_post_filtering == 'yes') {
  var final_dNBR_img = postFilteredValidation
}

if (do_post_filtering == 'no') {
  var final_dNBR_img = validation
}

// set the final image
var finalImage = final_dNBR_img;

// add dNBR to speckleTuning
var S1_S2 = oneImage.addBands(finalImage.rename('S2_DNBR'));


// Export images for accuracy assessment
Export.image.toDrive({image: ee.Image(S1_S2).updateMask(waterMask).clip(geometry.buffer(-200)).toFloat(), 
                      description: "SpeckleTuningTests", 
                      folder: 'SpeckleTuningTests',
                      region: geometry,
                      scale: 20,
                      crs: crs,
                      maxPixels: 10e9});
