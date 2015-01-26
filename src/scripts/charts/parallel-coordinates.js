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
    selectDisplayedDimContainer: undefined, //
    rulerSize: 10,
    useRulers: false,
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
    showMean: false,
    showHistogram: false,
    histogramPartition: 5,
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
      series: 'ct-series-mono',
      line: 'ct-parallelCoordinates',
      mean: 'ct-mean',
      histogram: 'ct-histogram',
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
    show: [],             //labels of dimensions that the user wants to see although they have been filtered out previously
    hide: [],             //labels of dimensions that the user wants to hide although they have been displayed previously
    maxValues: [],        //stores the maximum values of each axis - data records with higher value at the particular axis are hidden
    minValues: []         //stores the minimum values of each axis - data records with lower value at the particular axis are hidden
  };

  function createChart(options) {
    var seriesGroups = [],
      bounds,
      normalizedData = Chartist.normalizeDataArray(Chartist.getDataArray(this.data), this.data.labels.length);

    // Create new svg object
    this.svg = Chartist.createSvg(this.container, options.width, options.height, options.classNames.chart);

    //determine displayed dimensions; stores result in dimensions object
    determineDisplayedDimensions.call(this, options);

    // initialize bounds
    bounds = getBoundsArray.call(this, normalizedData, options);

    if(dimensions.display.length < 2) {
      window.console.error("Cannot draw parallel coordinate chart with fewer than two displayed dimensions");
      return;
    }

    //display menu that gives the user the ability to show / hide any dimension
    drawSelectDisplayedDimMenu.call(this, options, false);

    // create chart rect
    var chartRect = createChartRect.call(this, options);

    //draw all data records
    drawDataRecords.call(this, seriesGroups, options, chartRect, bounds, normalizedData);

    if(options.showMean) {
      drawMean(chartRect, options, bounds, normalizedData, this);
    }    

    //draw grid, axis and labels
    drawAxisGridsLabels.call(this, options, chartRect, bounds);

    if(options.showHistogram) {
      drawHistogram(chartRect, options, bounds, normalizedData, this);
    }

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
   * is specified by the front end develeoper.
   * In addition the user can show / hide dimensions using checkboxes in a separate menu - @see: drawSelectDisplayedDimMenu
   *
   * @param options
   */
  function determineDisplayedDimensions(options) {
    dimensions.display = [];
    dimensions.dimensionIndex = [];

    //determine number of displayed labels
    this.data.labels.forEach(function (value, index) {
      var interpolatedValue = options.axisX.labelInterpolationFnc(value, index);
      if (!interpolatedValue && interpolatedValue !== 0 && dimensions.show.indexOf(value) === -1) {
        return;
      }
      if(dimensions.hide.indexOf(value) === -1) {
        dimensions.display.push(value);
        dimensions.dimensionIndex.push(index);
      }
    });
  }

  function createChartRect(options) {
    var chartRect = Chartist.createChartRect(this.svg, options);
    //adjust chart rect, because labels should be drawn on top of the chart
    var chartRectY1Old = chartRect.y1,
      chartHeight = (Chartist.stripUnit(options.height) || this.svg.height());
    chartRect.y1 = chartHeight - chartRect.y2 - (options.useRulers ? 15 : 0);
    chartRect.y2 = chartHeight - chartRectY1Old;
    return chartRect;
  }

  function drawDataRecords(seriesGroups, options, chartRect, bounds, normalizedData) {

    for (var r = 0; r < this.data.series.length; r++) {

      seriesGroups[r] = this.svg.elem('g', {id:"dr"+r});

      // If the series is an object and contains a name we add a custom attribute
      if (this.data.series[r].name) {
        seriesGroups[r].attr({
          'series-name': this.data.series[r].name
        }, Chartist.xmlNs.uri);
      }

      // Use series class from series data or if not set generate one
      //seriesGroups[r].addClass([
      //  options.classNames.series,
      //  (this.data.series[r].className || options.classNames.series + '-' + Chartist.alphaNumerate(r))
      //].join(' '));

      seriesGroups[r].addClass(options.classNames.series);

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

    if(options.useRulers) {
      filterDataRecords(this.data, bounds);
    }
  }

  function drawHistogram(chartRect, options, bounds, normalizedData, that) {

    var numSteps = options.histogramPartition;
    var factor = 0.55;
    var i;

    var width = chartRect.width() / dimensions.display.length;
    var HistogramMaxWidth = width * factor;
    var height = (chartRect.height() / numSteps);

    var histogramSeries = that.svg.elem('g');
    //histogramSeries.addClass(options.classNames.histogram);

    dimensions.display.forEach(function (value, index) {
      var posX = chartRect.x1 + width * index;

      var currentDimIdx = dimensions.dimensionIndex[index];

      var step = (bounds[currentDimIdx].max - bounds[currentDimIdx].min + bounds[currentDimIdx].step) / numSteps;
      
      var valueList = [];

      for(i = 0; i < numSteps; i++) {
        valueList[i] = 0;
      }

      normalizedData.forEach(function(currData) {
        var data = currData[currentDimIdx];
        data -= bounds[currentDimIdx].min;

        if(data <= 0) {
          valueList[0] += 1;
        } else {
          valueList[Math.floor(data/step)] += 1;
        }
      });

      for(i = 0; i < numSteps; i++) {

        var val = valueList[numSteps - 1 - i];

        var l1 = (bounds[currentDimIdx].min + step * (numSteps - 1 - i));
        var l2 = (bounds[currentDimIdx].min + step * (numSteps - i));

        var l1_str =  l1.toFixed(2) + ' - ';
        var l2_str = l2.toFixed(2) +  ":";

        var label =  l1_str.concat(l2_str);
        if(val > 0) {
          var rect = histogramSeries.elem('rect', {
            x: posX + 2,
            y: chartRect.y2 + height*i,
            width: width * factor * val / normalizedData.length,
            height: height
          }, options.classNames.histogram).attr({
            'value': val,
            'label': label
          }, Chartist.xmlNs.uri);

          that.eventEmitter.emit('draw', {
            type: 'rect',
            index: numSteps - 1 - i,
            group: histogramSeries,
            element: rect,
            x1: rect.x,
            y1: rect.y,
            x2: rect.x + rect.width,
            y2: rect.y + rect.height
          });
        }
      }     
    });
  }

  function drawMean(chartRect, options, bounds, normalizedData, that) {
    var n = that.data.labels.length;
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

      dimensions.display.forEach(function(value, index) {
        currentDimIdx = dimensions.dimensionIndex[index];

        mean[currentDimIdx] += entry[currentDimIdx];
      });
    }

    for(i=0; i<n;i++) {
      mean[i] /= normalizedData.length;
    }

    var meanSeries = that.svg.elem('g');

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

    createXAxis.call(this, chartRect, this.data, grid, labels, options, this.eventEmitter, this.supportsForeignObject, bounds);
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

  function createXAxis(chartRect, data, grid, labels, options, eventEmitter, supportsForeignObject, bounds) {
    // Create X-Axis

    var that = this;
    dimensions.display.forEach(function (value, index) {
      var width = chartRect.width() / dimensions.display.length,
        height = options.axisX.offset,
        pos = chartRect.x1 + width * index;

      if(options.useRulers) {
        drawRuler.call(that, grid, chartRect, pos, bounds, dimensions.dimensionIndex[index]);
      }

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

  function drawRuler(grid, chartRect, pos, bounds, dimIndex) {
    var translateY = chartRect.y2;
    if(dimensions.maxValues.length > dimIndex) {
      translateY = Chartist.projectPoint(chartRect, bounds[dimIndex], [dimensions.maxValues[dimIndex]], 0).y;
    }
    var topRuler = grid.elem('path', {
      d: ['M',
          pos,
          0,
        'L',
          pos - 10,//options.rulerSize,
          -10,//options.rulerSize,
        'L',
          pos + 10,//,options.rulerSize,
          -10,//options.rulerSize,
        'z'].join(' '),
      style: 'fill-opacity: 1',
      transform: "matrix(1 0 0 1 0 "+translateY+")"
    }, 'ct-ruler');

    if(dimensions.maxValues.length <= dimIndex) {
      dimensions.maxValues.push(Chartist.inverseProjectPoint(chartRect, bounds[dimIndex], {y:translateY}).y);
    }

    var minValue = dimensions.minValues.length > dimIndex ? dimensions.minValues[dimIndex] : bounds[dimIndex].min;
    translateY = Chartist.projectPoint(chartRect, bounds[dimIndex], [minValue], 0).y;
    var bottomRuler = grid.elem('path', {
      d: ['M',
          pos,
          0,
        'L',
          pos - 10,//options.rulerSize,
          10,//options.rulerSize,
        'L',
          pos + 10,//options.rulerSize,
          10,//options.rulerSize,
        'z'].join(' '),
      style: 'fill-opacity: 1',
      transform: "matrix(1 0 0 1 0 "+translateY+")"
    }, 'ct-ruler');

    if(dimensions.minValues.length <= dimIndex) {
      dimensions.minValues.push(bounds[dimIndex].min);
    }

    //make elements draggable

    var svgNode = grid.parent()._node;

    function getYCoordinate(element) {
      var matrix = element.getAttributeNS(null, "transform").slice(7, -1).split(' ');
      return parseFloat(matrix[5]);
    }

    var onMoveAction = function(draggedElem, dx, dy) {

      var min = chartRect.y2;
      var max = getYCoordinate(bottomRuler._node);

      if(draggedElem === bottomRuler._node) {
        min = getYCoordinate(topRuler._node);
        max = chartRect.y1;
      }

      var currentMatrix = draggedElem.getAttributeNS(null, "transform").slice(7, -1).split(' ');
      currentMatrix[5] = parseFloat(currentMatrix[5]) + dy;

      if(currentMatrix[5] < min){
        currentMatrix[5] = min;
      } else if (currentMatrix[5] > max) {
        currentMatrix[5] = max;
      }

      var newMatrix = "matrix(" + currentMatrix.join(' ') + ")";
      draggedElem.setAttributeNS(null, "transform", newMatrix);
    };

    var svg = this.svg;
    var data = this.data;
    var onReleaseAction = function(draggedElem) {

      //convert pixels into axis value
      var pixel = getYCoordinate(draggedElem);
      if(draggedElem === topRuler._node) {
        dimensions.maxValues[dimIndex] = Chartist.inverseProjectPoint(chartRect, bounds[dimIndex], {y: pixel}).y;
      } else if(draggedElem === bottomRuler._node) {
        dimensions.minValues[dimIndex] = Chartist.inverseProjectPoint(chartRect, bounds[dimIndex], {y: pixel}).y;
      }

      filterDataRecords(data, bounds);
    };

    Chartist.makeDraggable(topRuler._node, svgNode, onMoveAction, onReleaseAction);
    Chartist.makeDraggable(bottomRuler._node, svgNode, onMoveAction, onReleaseAction);
  }

  /**
   * hides data records that are outside an allowed axis value range
   *
   * @param data
   * @param bounds
   */
  function filterDataRecords(data, bounds) {

    data.series.forEach(function(dataRecord, index) {
      var hide = false;

      //check all dimensions that are displayed currently
      dimensions.dimensionIndex.forEach(function(dimIndex) {
        var min = dimensions.minValues[dimIndex];
        var max = dimensions.maxValues[dimIndex];
        if(dataRecord[dimIndex] < min || dataRecord[dimIndex] > max) {
          hide = true;
        }
      });

      var style = hide ? "display:none" : "";
      document.getElementById("dr"+index).setAttribute("style", style);
    });
  }

  /**
   * this function draws a menu that gives the user the option to show or hide any dimension
   * -> gives the user the ability to override the decision of the front end developer to hide
   * a dimension on a particular screen/device
   */
  function drawSelectDisplayedDimMenu(options, supportsForeignObject){
    var html="<ul>";
    var that=this;
    var timestamp = Date.now();
    var checked = "";

    if (typeof options.selectDisplayedDimContainer === 'undefined') {
      return;
    }

    //create html
    this.data.labels.forEach(function(value, index) {
      checked = dimensions.display.indexOf(value) !== -1 ? "checked" : "";
      html += "<li><input id=\""+timestamp+value+"\" type=\"checkbox\" "+checked+">"+value+"</li>";
    });
    html += "</ul>";

    //get enclosing container and add html string
    var filterContainer = document.querySelector(options.selectDisplayedDimContainer);
    filterContainer.innerHTML = html;

    //attach event handler
    this.data.labels.forEach(function(value, index){
      document.getElementById(timestamp+value).addEventListener("change", function(e){

        var i = -1;
        var add = [];
        var remove = [];
        if(e.target.checked) {
          add = dimensions.show;
          remove = dimensions.hide;
        } else{
          add = dimensions.hide;
          remove = dimensions.show;
        }

        i = remove.indexOf(value);
        if(i !== -1){
          remove.splice(i, 1);
        } else{
          add.push(value);
        }
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
