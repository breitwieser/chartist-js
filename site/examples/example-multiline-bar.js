new Chartist.Bar('.ct-chart', {
  labels: ['First quarter of the year', 'Second quarter of the year', 'Third quarter of the year', 'Fourth quarter of the year'],
  series: [
    [60000, 40000, 80000, 70000],
    [40000, 30000, 70000, 65000],
    [8000, 3000, 10000, 6000]
  ]
}, {
  seriesBarDistance: 10,
  axisX: {
    offset: 60
  },
  axisY: {
    labelInterpolationFnc: function(value) {
      return (value/10000) + 'k CHF'
    },
    scaleMinSpace: 15
  }
},[
  ['screen and (max-width: 640px)', {
    seriesBarDistance: 5,
    axisX: {
      labelInterpolationFnc: function (value) {
        return value.substring(0,5);
      }
    }
  }]
]).on('draw', function(data) {
    if(data.type === 'label' && data.axis === 'x') {
      data.element.attr({
        width: 50
      })
    }
  });