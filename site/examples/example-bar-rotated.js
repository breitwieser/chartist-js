new Chartist.Bar('.ct-chart', {
  labels: ['Label one', 'Label two', 'Label three', 'Label four','Label one'],
  series: [[1, 2, 3, 4, 5]],
  axisX: {
    rotateLabels: true
  }
}).on('draw', function(data) {
    if(data.type === 'label' && data.axis === 'x') {
      data.element.attr({
        /* width: 200 */
      })
    }
  });