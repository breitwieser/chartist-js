var data = {
  labels: ['foo', 'bar', 'test', 'bla', 'pc-var'],
  series: [
    [12, 9, 7, 8, 5],
    [2, 1, 3.5, 7, 3],
    [1, 3, 4, 5, 6],
    [3, 3, 3, 3, 3],
    [8, 4, 6, 1, 4]
  ]
};

new Chartist.ParallelCoordinates('.ct-chart', data);

/* Add a basic data series with six labels and values */

