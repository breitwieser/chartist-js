var responsiveOptions = [
        ['screen and (max-width: 28em)', {
            rotate: true
        }],
        ['screen and (min-width: 28em)', {
            rotate: false
        }]
    ];

    new Chartist.Bar('.ct-chart', {
        labels: ['2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011'],
        series: [
            [60, 40, 10, 20, 30, 50, 60, 40, 30],
            [50, 50, 30, 40, 40, 55, 34, 21, 33],
            [30, 20, 50, 40, 30, 25, 54, 51, 23]
        ]
    }, {
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
    }, responsiveOptions);
