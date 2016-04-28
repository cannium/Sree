define(['jquery', 'bootstrap', 'dataTableBootstrap', 'aws'],
    function ($) {
    var base_fn = {
        init: function () {
            this.initConfig();
            this.s3 = new AWS.S3();
        },
        initConfig: function () {
            var endpoint = window.localStorage.getItem('endpoint') || 'http://s3.amazonaws.com',
                region = window.localStorage.getItem('region') || 'us-east-1',
                accessKeyId = window.localStorage.getItem('accessKeyId'),
                secretKeyId = window.localStorage.getItem('secretKeyId');
            if((!accessKeyId || !secretKeyId) &&
                window.location.pathname !== '/config.html') {
                this.alert2('Please configure your keys first');
                window.setTimeout(function() {
                    window.location = '/config.html';
                }, 2000);
            }
            AWS.config.endpoint = endpoint;
            AWS.config.region = region;
            AWS.config.accessKeyId = accessKeyId;
            AWS.config.secretAccessKey = secretKeyId;
            AWS.config.s3ForcePathStyle = true;
        },
        getSignedUrl: function (info, param) {
            return this.s3.getSignedUrl(info, param);
        },
        checkAll: function () {
            var _this = this;
            // select-all checkbox
            $("#btnCheckAll").click(function () {
                $(".chkItem").prop("checked", this.checked);
                _this.inputSelect();
            });
            // determine if select-all should be checked
            $("tbody").on("click", ".chkItem", function () {
                var $subs = $(".chkItem");
                $("#btnCheckAll").prop("checked",
                    $subs.length == $subs.filter(":checked").length ? true : false);
                _this.inputSelect();
            });
        },
        inputSelect: function () {
            var selectId = [];
            $(":checkbox:checked:not('#btnCheckAll')").each(function () {
                selectId[selectId.length] = $(this).attr("data-id");
            });
            $("#selected").val(selectId);
        },
        formatDate: function (time, fmt) {
            var o = {
                "M+": time.getMonth() + 1,
                "d+": time.getDate(),
                "h+": time.getHours(),
                "m+": time.getMinutes(),
                "s+": time.getSeconds(),
                "q+": Math.floor((time.getMonth() + 3) / 3),
                "S": time.getMilliseconds()
            };
            if (/(y+)/.test(fmt))
                fmt = fmt.replace(RegExp.$1,
                    (time.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o) {
                if (new RegExp("(" + k + ")").test(fmt))
                    fmt = fmt.replace(RegExp.$1,
                        (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
            return fmt;
        },
        alert2: function (info) {
            var obj = $(".alert_info");
            obj.text(info).addClass("in");
            setTimeout(function () {
                obj.removeClass("in error");
            }, 2500);
        },
        alertError: function(info){
            $(".alert_info").addClass("error");
            this.alert2(info);
        }
    };
    base_fn.init();
    return base_fn;
});
