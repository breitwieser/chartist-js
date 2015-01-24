var data =  {
    labels: ['Label 1', 'Label 2', 'Label 3', 'Label 4'],
    series: [
        [60, 40, 10, 20]
    ]
};

var options = {
    chartPadding: 20,
    seriesBarDistance: 10,
    axisX: {
      offset: 80
    },
    axisY: {
        offset: 50,
            labelInterpolationFnc: function(value) {
            return value + '\' CHF'
        },
        scaleMinSpace: 15
    }
};

var responsiveOptions = [
    ['screen and (max-width: 5in)', {
        rotate: true
    }],
    ['screen and (min-width: 5in)', {
        rotate: false
    }]
];

new Chartist.Bar('.ct-chart',data, options, responsiveOptions);