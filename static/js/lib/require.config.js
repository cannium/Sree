//requirejs config add by myy 12/24
requirejs.config({
    baseUrl: '/js',
    shim:{
        'bootstrap':['jquery'],
        'dataTable':['jquery'],
        'dataTableBootstrap':['jquery','dataTable'],
        'validate':['jquery'],
        'validate-zh_CN':['jquery'],
        'validateMethod':['jquery','validate'],
        'form':['jquery'],
        'upload':['jquery', 'base']
    },
    paths: {
        'jquery': [
            'lib/jquery-1.10.1.min',
            //If the location fails, load from this CDN
            'http://libs.baidu.com/jquery/1.11.1/jquery.min'
        ],
        'bootstrap':'lib/bootstrap.min',
        'validate-zh_CN': 'lib/jquery.validationEngine-zh_CN',
        'validate':'lib/jquery.validationEngine',
        'form':'lib/jquery.form',
        'dataTable':'lib/jquery.dataTables',
        'dataTableBootstrap':'lib/dataTable.bootstrap',
        'template':'lib/template',
        'base':'base',
        'aws':'lib/aws-sdk.min',
        'tpl':'lib/template',
        'upload':'upload'
    }
});
