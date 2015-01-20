

var data = {
  labels: ['foo', 'bar', 'test', 'bla', 'pc-var'],
  series: [
    [12, 9, 7, 8, 5],
    [2, 1, 3.5, 7, 3],
    [1, 3, 4, 5, 6],
    [1.5, 5, 3, 5, 4]
  ]
};

var options = {
	showMean: true,
  showHistogram: true,
  histogramPartition: 10
};

var responsiveOptions = [
        ['screen and (max-width: 600px)', {
            axisX: {
                labelInterpolationFnc: function(value, index) {
                    return ["foo", "bla", "pc-var"].indexOf(value) != -1 ? value : null;
                }
            }
        }],
        ['screen and (min-width: 600px)', {
            axisX: {
                labelInterpolationFnc: function(value, index) {
                    return value;
                }
            }
        }]
    ];

var $chart = $('.ct-chart');

var $toolTip = $chart
  .append('<div class="tooltip"></div>')
  .find('.tooltip')
  .hide();

$chart.on('mouseenter', '.ct-histogram', function() {
  var $hist = $(this),
    value = $hist.attr('ct:value'),
    label = $hist.attr('ct:label');
    //seriesName = $hist.parent().attr('ct:series-name');

  //$hist.animate({'stroke-width': '50px'}, 300, easeOutQuad);
  $toolTip.html(label + '<br>' + value).show();
});

$chart.on('mouseleave', '.ct-histogram', function() {
  var $hist = $(this);

  //$hist.animate({'stroke-width': '20px'}, 300, easeOutQuad);
  $toolTip.hide();
});

$chart.on('mousemove', function(event) {
  $toolTip.css({
    left: (event.offsetX || event.originalEvent.layerX) - $toolTip.width() / 2 - 10,
    top: (event.offsetY || event.originalEvent.layerY) - $toolTip.height() - 40
  });
});

new Chartist.ParallelCoordinates('.ct-chart', data, options, responsiveOptions);

/* Add a basic data series with six labels and values */

