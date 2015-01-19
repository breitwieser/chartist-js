

var data = {
  labels: ['foo', 'bar', 'test', 'bla', 'pc-var'],
  series: [
    [12, 9, 7, 8, 5],
    [2, 1, 3.5, 7, 3],
    [1, 3, 4, 5, 6]
  ]
};

var options = {
	showMean: true
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

new Chartist.ParallelCoordinates('.ct-chart', data, options, responsiveOptions);

/* Add a basic data series with six labels and values */

