/**
 * The ParallelCoordinates module of Chartist can be used to draw parallel coordinate charts
 *
 * @module Chartist.ParallelCoordinates
 */
/* global Chartist */
(function(window, document, Chartist){
  'use strict';

  //TODO adjust options to parallel coordinates - copied from line chart
  var defaultOptions = {
    filteredDimContainer: undefined, //
    axisX: {
      offset: 30,
      labelOffset: {
        x: 0,
        y: 0
      },
      showLabel: true,
      showGrid: true,
      labelInterpolationFnc: Chartist.noop
    },
    axisY: {
      offset: 40,
      labelOffset: {
        x: 0,
        y: 0
      },
      showLabel: true,
      showGrid: true,
      labelInterpolationFnc: Chartist.noop,
      scaleMinSpace: 20
    },
    width: undefined,
    height: undefined,
    showLine: true,
    showPoint: true,
    showArea: false,
    showMean: true,
    areaBase: 0,
    lineSmooth: true,
    low: undefined,
    high: undefined,
    lineWidth: 2,
    chartPadding: 5,
    classNames: {
      chart: 'ct-chart-parallelCoordinates',
      label: 'ct-label',
      labelGroup: 'ct-labels',
      series: 'ct-series',
      line: 'ct-parallelCoordinates',
      mean: 'ct-mean',
      point: 'ct-point',
      area: 'ct-area',
      grid: 'ct-grid',
      gridGroup: 'ct-grids',
      vertical: 'ct-vertical',
      horizontal: 'ct-horizontal'
    }
  };

  var dimensions = {
    display: [],          //labels of the displayed dimensions
    dimensionIndex: [],   //index of the displayed dimension
    filtered: [],         //labels of dimensions that are not rendered in the chart
    filterRemoved: []     //labels of dimensions that the user wants to see although they have been filtered out at first
  };

  function createChart(options) {
    var seriesGroups = [],
      bounds,
      normalizedData = Chartist.normalizeDataArray(Chartist.getDataArray(this.data), this.data.labels.length);

    // Create new svg object
    this.svg = Chartist.createSvg(this.container, options.width, options.height, options.classNames.chart);

    //determine displayed/filtered dimensions; stores result in dimensions
    determineDisplayedDimensions.call(this, options);

    // initialize bounds
    bounds = getBoundsArray.call(this, normalizedData, options);

    if(dimensions.display.length < 2) {
      window.console.error("Cannot draw parallel coordinate chart with fewer than two displayed dimensions");
      return;
    }

    //display dimensions that have been filtered out and give the user the option to see them
    drawFilteredDimensions.call(this, options, false);

    // create chart rect
    var chartRect = createChartRect.call(this, options);

    //draw all data records
    drawDataRecords.call(this, seriesGroups, options, chartRect, bounds, normalizedData);

    if(options.showMean) {
      drawMean(chartRect, options, bounds, normalizedData, this.svg);
    }    
    
    //draw grid, axis and labels
    drawAxisGridsLabels.call(this, options, chartRect, bounds);

    this.eventEmitter.emit('created', {
      bounds: bounds,
      chartRect: chartRect,
      svg: this.svg,
      options: options
    });
  }

  function getBoundsArray(normalizedData, options) {
    var bounds = [],
      normalizedDataTransposed,
      that = this;

    //transpose data object
    normalizedDataTransposed = transpose(normalizedData);

    this.data.labels.forEach(function (value, index) {
        bounds[index] = Chartist.getBounds(that.svg, [normalizedDataTransposed[index]], options);
    });
    return bounds;
  }

  /**
   * Determines which dimensions should be displayed and which ones are filtered out
   * dimensions are filtered by using axisX labelInterpolationFnc inside responsiveOptions - this default filtering behaviour
   * is specified by the front end devleoper.
   * Dimensions that are filtered out are later shown to the user, who can then decide if he wants to see them
   *
   * @param options
   */
  function determineDisplayedDimensions(options) {
    dimensions.display = [];
    dimensions.dimensionIndex = [];
    dimensions.filtered = [];

    //determine number of displayed labels
    this.data.labels.forEach(function (value, index) {
      var interpolatedValue = options.axisX.labelInterpolationFnc(value, index);
      if (!interpolatedValue && interpolatedValue !== 0 && dimensions.filterRemoved.indexOf(value) === -1) {
        dimensions.filtered.push(value);
        return;
      }
      dimensions.display.push(value);
      dimensions.dimensionIndex.push(index);
    });
  }

  function createChartRect(options) {
    var chartRect = Chartist.createChartRect(this.svg, options);
    //adjust chart rect, because labels should be drawn on top of the chart
    var chartRectY1Old = chartRect.y1,
      chartHeight = (Chartist.stripUnit(options.height) || this.svg.height());
    chartRect.y1 = chartHeight - chartRect.y2;
    chartRect.y2 = chartHeight - chartRectY1Old;
    return chartRect;
  }

  function drawDataRecords(seriesGroups, options, chartRect, bounds, normalizedData) {
    for (var r = 0; r < this.data.series.length; r++) {

      seriesGroups[r] = this.svg.elem('g');

      // If the series is an object and contains a name we add a custom attribute
      if (this.data.series[r].name) {
        seriesGroups[r].attr({
          'series-name': this.data.series[r].name
        }, Chartist.xmlNs.uri);
      }

      // Use series class from series data or if not set generate one
      seriesGroups[r].addClass([
        options.classNames.series,
        (this.data.series[r].className || options.classNames.series + '-' + Chartist.alphaNumerate(r))
      ].join(' '));

      //draw connection lines for this series
      var lastDimIdx = -1;
      var currentDimIdx = -1;
      var that = this;
      dimensions.display.forEach(function (value, index) {

        if(index === 0) {
          return;
        }

        //this indexes are needed to retrieve the bounds object that belongs to the dimension
        currentDimIdx = dimensions.dimensionIndex[index];
        lastDimIdx = dimensions.dimensionIndex[index-1];

        var width = chartRect.width() / dimensions.display.length,
          posX1 = chartRect.x1 + width * (index - 1),
          posX2 = chartRect.x1 + width * index,
          posY1 = Chartist.projectPoint(chartRect, bounds[lastDimIdx], normalizedData[r], lastDimIdx).y,
          posY2 = Chartist.projectPoint(chartRect, bounds[currentDimIdx], normalizedData[r], currentDimIdx).y;

        var line = seriesGroups[r].elem('line', {
          x1: posX1,
          y1: posY1,
          x2: posX2,
          y2: posY2
        }, options.classNames.line);

        that.eventEmitter.emit('draw', {
          type: 'line',
          values: normalizedData[r],
          index: r,
          group: seriesGroups[r],
          element: line
        });
      });
    }
  }

  function drawMean(chartRect, options, bounds, normalizedData, svg) {
    var n = dimensions.display.length;
    var i,j;
    var entry;
    var mean = [];
    var currentDimIdx = -1;
    var lastDimIdx = -1;

    for(i=0; i<n; i++) {
      mean[i] = 0;
    }

    // get mean
    for (i = 0; i < normalizedData.length; i++) {
    entry = normalizedData[i];
    for (j = 0; j < entry.length; j++) {
        mean[j] += entry[j]; 
      }
    }

    for(i=0; i<n;i++) {
      mean[i] /= normalizedData.length;
    }

    var meanSeries = svg.elem('g');

    dimensions.display.forEach(function(value, index) {
        
        if(index == 0) {
          return;
        }

        currentDimIdx = dimensions.dimensionIndex[index];
        lastDimIdx = dimensions.dimensionIndex[index-1];

        var width = chartRect.width() / dimensions.display.length,
          posX1 = chartRect.x1 + width * (index - 1),
          posX2 = chartRect.x1 + width * index,
          posY1 = Chartist.projectPoint(chartRect, bounds[lastDimIdx], mean, lastDimIdx).y,
          posY2 = Chartist.projectPoint(chartRect, bounds[currentDimIdx], mean, currentDimIdx).y;

        var line = meanSeries.elem('line', {
          x1: posX1,
          y1: posY1,
          x2: posX2,
          y2: posY2
        }, options.classNames.mean);
      });
  }

  function drawAxisGridsLabels(options, chartRect, bounds) {
    var labels = this.svg.elem('g').addClass(options.classNames.labelGroup),
      grid = this.svg.elem('g').addClass(options.classNames.gridGroup);

    createXAxis(chartRect, this.data, grid, labels, options, this.eventEmitter, this.supportsForeignObject);
    var that = this;
    dimensions.display.forEach(function (value, index) {
      var boundsIndex = dimensions.dimensionIndex[index];
      var width = chartRect.width() / dimensions.display.length,
        posX = chartRect.x1 + width * index;
      createYAxis(chartRect, bounds[boundsIndex], grid, labels, options, that.eventEmitter, that.supportsForeignObject, posX);
    });
  }

  //TODO move this function into the core module
  //https://gist.github.com/femto113/1784503
  function transpose(a){
    return a[0].map(function (_, c) { return a.map(function (r) { return r[c]; }); });
  }

  //TODO duplicated code of Core.createYAxis that has been modified slightly - maybe better to adjust function in core
  function createYAxis(chartRect, bounds, grid, labels, options, eventEmitter, supportsForeignObject, posX) {
    // Create Y-Axis
    bounds.values.forEach(function (value, index) {
      var interpolatedValue = options.axisY.labelInterpolationFnc(value, index),
        width = options.axisY.offset,
        height = chartRect.height() / bounds.values.length,
        pos = chartRect.y1 - height * index;

      // If interpolated value returns falsey (except 0) we don't draw the grid line
      if (!interpolatedValue && interpolatedValue !== 0) {
        return;
      }

      if (options.axisY.showGrid) {
        var gridElement = grid.elem('line', {
          x1: posX-10,
          y1: pos,
          x2: posX,
          y2: pos
        }, [options.classNames.grid, options.classNames.vertical].join(' '));

        // Event for grid draw
        eventEmitter.emit('draw', {
          type: 'grid',
          axis: 'y',
          index: index,
          group: grid,
          element: gridElement,
          x1: chartRect.x1,
          y1: pos,
          x2: chartRect.x2,
          y2: pos
        });
      }

      if (options.axisY.showLabel) {
        var labelPosition = {
          x: posX + options.chartPadding + options.axisY.labelOffset.x + (supportsForeignObject ? -10 : 0),
//          y: pos + options.axisY.labelOffset.y + (supportsForeignObject ? -15 : 0)
          y: pos + (supportsForeignObject ? -15 : 0)
        };

        var labelElement = Chartist.createLabel(labels, '' + interpolatedValue, {
          x: labelPosition.x,
          y: labelPosition.y,
          width: width,
          height: height,
          style: 'overflow: visible;'
        }, [options.classNames.label, options.classNames.vertical].join(' '), supportsForeignObject);

        eventEmitter.emit('draw', {
          type: 'label',
          axis: 'y',
          index: index,
          group: labels,
          element: labelElement,
          text: '' + interpolatedValue,
          x: labelPosition.x,
          y: labelPosition.y,
          width: width,
          height: height,
          // TODO: Remove in next major release
          get space() {
            window.console.warn('EventEmitter: space is deprecated, use width or height instead.');
            return this.height;
          }
        });
      }
    });
  };

  function createXAxis(chartRect, data, grid, labels, options, eventEmitter, supportsForeignObject) {
    // Create X-Axis
    dimensions.display.forEach(function (value, index) {
      var width = chartRect.width() / dimensions.display.length,
        height = options.axisX.offset,
        pos = chartRect.x1 + width * index;

      if (options.axisX.showGrid) {
        var gridElement = grid.elem('line', {
          x1: pos,
          y1: chartRect.y1,
          x2: pos,
          y2: chartRect.y2
        }, [options.classNames.grid, options.classNames.horizontal].join(' '));

        // Event for grid draw
        eventEmitter.emit('draw', {
          type: 'grid',
          axis: 'x',
          index: index,
          group: grid,
          element: gridElement,
          x1: pos,
          y1: chartRect.y1,
          x2: pos,
          y2: chartRect.y2
        });
      }

      if (options.axisX.showLabel) {
        var labelPosition = {
          x: pos + options.axisX.labelOffset.x,
          y: options.chartPadding + options.axisX.labelOffset.y + (supportsForeignObject ? 5 : 20)
        };

        var labelElement = Chartist.createLabel(labels, '' + value, {
          x: labelPosition.x,
          y: labelPosition.y,
          width: width,
          height: height,
          style: 'overflow: visible;'
        }, [options.classNames.label, options.classNames.horizontal].join(' '), supportsForeignObject);

        eventEmitter.emit('draw', {
          type: 'label',
          axis: 'x',
          index: index,
          group: labels,
          element: labelElement,
          text: '' + value,
          x: labelPosition.x,
          y: labelPosition.y,
          width: width,
          height: height,
          // TODO: Remove in next major release
          get space() {
            window.console.warn('EventEmitter: space is deprecated, use width or height instead.');
            return this.width;
          }
        });
      }
    });
  };

  /**
   * this function draws a menu that gives the user the option to display a dimension
   * if it has been hidden through responsiveOptions -> overrides the decision of the
   * front end developer to hide a dimension on a particular screen/device
   */
  function drawFilteredDimensions(options, supportsForeignObject){
    var html="";
    var that=this;
    var timestamp = Date.now();

    if (typeof options.filteredDimContainer === 'undefined') {
      return;
    }

    //create html
    dimensions.filtered.forEach(function(value, index) {
      html += value+ " <a id=\""+timestamp+value+"\" href=\"#\">x</a><br>";
    });

    //get enclosing container and add html string
    var filterContainer = document.querySelector(options.filteredDimContainer);
    filterContainer.innerHTML = html;

    //attach click event handler
    dimensions.filtered.forEach(function(value, index){
      document.getElementById(timestamp+value).addEventListener("click", function(e){
        dimensions.filterRemoved.push(value);
        that.update();
      });
    });
  }

  function ParallelCoordinates(query, data, options, responsiveOptions) {
    Chartist.ParallelCoordinates.super.constructor.call(this,
      query,
      data,
      Chartist.extend({}, defaultOptions, options),
      responsiveOptions);
  }

  // Creating line chart type in Chartist namespace
  Chartist.ParallelCoordinates = Chartist.Base.extend({
    constructor: ParallelCoordinates,
    createChart: createChart
  });

}(window, document, Chartist));
