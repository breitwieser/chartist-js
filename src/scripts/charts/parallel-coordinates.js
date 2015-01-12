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
    areaBase: 0,
    lineSmooth: true,
    low: undefined,
    high: undefined,
    chartPadding: 5,
    classNames: {
      chart: 'ct-chart-line',
      label: 'ct-label',
      labelGroup: 'ct-labels',
      series: 'ct-series',
      line: 'ct-line',
      point: 'ct-point',
      area: 'ct-area',
      grid: 'ct-grid',
      gridGroup: 'ct-grids',
      vertical: 'ct-vertical',
      horizontal: 'ct-horizontal'
    }
  };

  function createChart(options) {
    var seriesGroups = [],
      bounds = [],
      normalizedData = Chartist.normalizeDataArray(Chartist.getDataArray(this.data), this.data.labels.length);

    // Create new svg object
    this.svg = Chartist.createSvg(this.container, options.width, options.height, options.classNames.chart);

    //transpose data object
    var normalizedDataTransposed = transpose(normalizedData);

    // initialize bounds
    var that = this;
    this.data.labels.forEach(function(value, index){
      bounds[index] = Chartist.getBounds(that.svg, [normalizedDataTransposed[index]], options);
    });

    // Start drawing
    var chartRect = Chartist.createChartRect(this.svg, options);
    //adjust chart rect, because labels should be drawn on top of the chart
    var chartRectY1Old = chartRect.y1,
      chartHeight = (Chartist.stripUnit(options.height) || this.svg.height());
    chartRect.y1 = chartHeight - chartRect.y2;
    chartRect.y2 = chartHeight - chartRectY1Old;

    //draw all series
    for(var r = 0; r < this.data.series.length; r++) {

      seriesGroups[r] = this.svg.elem('g');

      // If the series is an object and contains a name we add a custom attribute
      if(this.data.series[r].name) {
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
      for(var i = 1; i < this.data.labels.length; i++) {
        var width = chartRect.width() / that.data.labels.length,
          posX1 = chartRect.x1 + width * (i - 1),
          posX2 = chartRect.x1 + width * i,
          posY1 = Chartist.projectPoint(chartRect, bounds[i-1], normalizedData[r], i-1).y,
          posY2 = Chartist.projectPoint(chartRect, bounds[i], normalizedData[r], i).y;

        var gridElement = seriesGroups[r].elem('line', {
          x1: posX1,
          y1: posY1,
          x2: posX2,
          y2: posY2
        }, options.classNames.line);

        //Todo emitt event
      }
    }

    //draw grid, axis and labels
    var labels = this.svg.elem('g').addClass(options.classNames.labelGroup),
      grid = this.svg.elem('g').addClass(options.classNames.gridGroup);

    createXAxis(chartRect, this.data, grid, labels, options, this.eventEmitter, this.supportsForeignObject);
    bounds.forEach(function(value, index){
      var width = chartRect.width() / that.data.labels.length,
        posX = chartRect.x1 + width * index;
      createYAxis(chartRect, bounds[index], grid, labels, options, that.eventEmitter, that.supportsForeignObject, posX);
    });

//    // Draw the series
//    // initialize series groups
//    for (var i = 0; i < this.data.series.length; i++) {
//      seriesGroups[i] = this.svg.elem('g');
//
//      // If the series is an object and contains a name we add a custom attribute
//      if(this.data.series[i].name) {
//        seriesGroups[i].attr({
//          'series-name': this.data.series[i].name
//        }, Chartist.xmlNs.uri);
//      }
//
//      // Use series class from series data or if not set generate one
//      seriesGroups[i].addClass([
//        options.classNames.series,
//        (this.data.series[i].className || options.classNames.series + '-' + Chartist.alphaNumerate(i))
//      ].join(' '));
//
//      var p,
//        pathCoordinates = [],
//        point;
//
//      for (var j = 0; j < normalizedData[i].length; j++) {
//        p = Chartist.projectPoint(chartRect, bounds, normalizedData[i], j);
//        pathCoordinates.push(p.x, p.y);
//
//        //If we should show points we need to create them now to avoid secondary loop
//        // Small offset for Firefox to render squares correctly
//        if (options.showPoint) {
//          point = seriesGroups[i].elem('line', {
//            x1: p.x,
//            y1: p.y,
//            x2: p.x + 0.01,
//            y2: p.y
//          }, options.classNames.point).attr({
//            'value': normalizedData[i][j]
//          }, Chartist.xmlNs.uri);
//
//          this.eventEmitter.emit('draw', {
//            type: 'point',
//            value: normalizedData[i][j],
//            index: j,
//            group: seriesGroups[i],
//            element: point,
//            x: p.x,
//            y: p.y
//          });
//        }
//      }
//
//      // TODO: Nicer handling of conditions, maybe composition?
//      if (options.showLine || options.showArea) {
//        // TODO: We should add a path API in the SVG library for easier path creation
//        var pathElements = ['M' + pathCoordinates[0] + ',' + pathCoordinates[1]];
//
//        // If smoothed path and path has more than two points then use catmull rom to bezier algorithm
//        if (options.lineSmooth && pathCoordinates.length > 4) {
//
//          var cr = Chartist.catmullRom2bezier(pathCoordinates);
//          for(var k = 0; k < cr.length; k++) {
//            pathElements.push('C' + cr[k].join());
//          }
//        } else {
//          for(var l = 3; l < pathCoordinates.length; l += 2) {
//            pathElements.push('L' + pathCoordinates[l - 1] + ',' + pathCoordinates[l]);
//          }
//        }
//
//        if(options.showArea) {
//          // If areaBase is outside the chart area (< low or > high) we need to set it respectively so that
//          // the area is not drawn outside the chart area.
//          var areaBase = Math.max(Math.min(options.areaBase, bounds.max), bounds.min);
//
//          // If we need to draw area shapes we just make a copy of our pathElements SVG path array
//          var areaPathElements = pathElements.slice();
//
//          // We project the areaBase value into screen coordinates
//          var areaBaseProjected = Chartist.projectPoint(chartRect, bounds, [areaBase], 0);
//          // And splice our new area path array to add the missing path elements to close the area shape
//          areaPathElements.splice(0, 0, 'M' + areaBaseProjected.x + ',' + areaBaseProjected.y);
//          areaPathElements[1] = 'L' + pathCoordinates[0] + ',' + pathCoordinates[1];
//          areaPathElements.push('L' + pathCoordinates[pathCoordinates.length - 2] + ',' + areaBaseProjected.y);
//
//          // Create the new path for the area shape with the area class from the options
//          var area = seriesGroups[i].elem('path', {
//            d: areaPathElements.join('')
//          }, options.classNames.area, true).attr({
//            'values': normalizedData[i]
//          }, Chartist.xmlNs.uri);
//
//          this.eventEmitter.emit('draw', {
//            type: 'area',
//            values: normalizedData[i],
//            index: i,
//            group: seriesGroups[i],
//            element: area
//          });
//        }
//
//        if(options.showLine) {
//          var line = seriesGroups[i].elem('path', {
//            d: pathElements.join('')
//          }, options.classNames.line, true).attr({
//            'values': normalizedData[i]
//          }, Chartist.xmlNs.uri);
//
//          this.eventEmitter.emit('draw', {
//            type: 'line',
//            values: normalizedData[i],
//            index: i,
//            group: seriesGroups[i],
//            element: line
//          });
//        }
//      }
//    }
//
//    this.eventEmitter.emit('created', {
//      bounds: bounds,
//      chartRect: chartRect,
//      svg: this.svg,
//      options: options
//    });
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
    data.labels.forEach(function (value, index) {
      var interpolatedValue = options.axisX.labelInterpolationFnc(value, index),
        width = chartRect.width() / data.labels.length,
        height = options.axisX.offset,
        pos = chartRect.x1 + width * index;

      // If interpolated value returns falsey (except 0) we don't draw the grid line
      if (!interpolatedValue && interpolatedValue !== 0) {
        return;
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
//          y: chartRect.y1 + options.axisX.labelOffset.y + (supportsForeignObject ? 5 : 20)
          y: options.chartPadding + options.axisX.labelOffset.y + (supportsForeignObject ? 5 : 20)  //TODO this is the only line differing from the original function in core
        };

        var labelElement = Chartist.createLabel(labels, '' + interpolatedValue, {
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
          text: '' + interpolatedValue,
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
