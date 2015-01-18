var data = {
  labels: ['foo', 'bar', 'test', 'bla', 'pc-var'],
  series: [
    [12, 9, 7, 8, 5],
    [2, 1, 3.5, 7, 3],
    [1, 3, 4, 5, 6],
    [3, 3, 3, 3, 3],
    [8, 4, 6, 1, 4],
    [7, 2, 1, 9, 3.3],
    [1, 2, 12, 3, 3],
    [9, 8, 3, 5, 2]
  ]
};

var options = {
	showMean: false
}

new Chartist.ParallelCoordinates('.ct-chart', data, options);

/* Add a basic data series with six labels and values */

