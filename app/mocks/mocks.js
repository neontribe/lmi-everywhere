(function($) {
    'use strict';
    $.mockjax({
        url: 'http://api.lmiforall.org.uk/api/soc/search',
        responseTime: 500,
        proxy: '/mocks/search_results.json'
    });

    $.mockjax({
        url: 'http://api.lmiforall.org.uk/api/wf/predict',
        responseTime: 500,
        proxy: '/mocks/predictions.json'
    });
})(jQuery);