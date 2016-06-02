define(['base'], function (base) {
    var acl = window.localStorage.getItem('acl') || 'public-read';
    var upload_fn = {
        init: function() {
            this.uploaders = {};
            this.prefix = '';
            this.bucketName = this.getBucketName(location.search);
            if(!this.bucketName) {
                base.alertError('Missing bucket name');
                return;
            }
            $('#title').text('Bucket: ' + this.bucketName);
            var _this = this;

            // clear unfinished uploads before page refresh and close
            window.onbeforeunload = _this.cleanUploads;

            // upload button
            $("#uploadBtn").click(function () {
                $("#file").trigger("click");
            });
            $("#file").on('change', function () {
                var fileInput = this.files;
                if (fileInput != null) {
                    $("#uploader").removeClass("hide min");
                    for (var i = 0; i < fileInput.length; i++) {
                        _this.uploadOneObject(fileInput[i]);
                    }
                }
            });
            // minimize/maximize upload status list
            $(".upload_min").click(function () {
                $("#uploader").addClass("min");
            });
            $(".upload_back").click(function () {
                $("#uploader").removeClass("min");
            });
            // pause
            $("#uploadList").on("click", ".operate_pause", function () {
                var entry = $(this).parents(".file_entry");
                entry.attr("class", "file_entry status_pause");
                var uploader = _this.uploaders[entry.data('uploadKey')];
                uploader.abort();
                base.alert2('Upload paused');
            });
            // continue
            $("#uploadList").on("click", ".operate_continue, .operate_retry", function () {
                var entry = $(this).parents(".file_entry");
                entry.attr("class", "file_entry status_uploading");
                var uploader = _this.uploaders[entry.data('uploadKey')];
                uploader.send(uploader.sendCallback);
                base.alert2('Upload continued');
            });
            // cancel uploading(when status_uploading)
            // or remove file entry(when status_success)
            $("#uploadList").on("click", ".operate_remove", function () {
                var entry = $(this).parents('.file_entry');
                var uploader = _this.uploaders[entry.data('uploadKey')];
                $(this).parents(".file_entry").remove();
                if(entry.hasClass('status_success')) return;

                if(uploader && uploader.service.config.params.UploadId) {
                    uploader.service.abortMultipartUpload().send();
                }
                delete _this.uploaders[entry.data('uploadKey')];
                base.alert2('Upload canceled');
            });
            // delete objects
            $("#delBtn").click(function(){
                var curr = $("#selected").val();
                if(curr.length==0){
                    base.alertError("Please select an object to delete");
                    return;
                }else{
                    $("#objectsName").html(curr);
                }
                $("#deleteModal").modal("show");
            });
            $("#deleteSubmit").click(function(){
                var objects = $("#objectsName").text().split(',').map(function(name) {
                    return {Key: name};
                });
                $('#deleteModal').modal('hide');
                $('#loading').show();
                base.s3.deleteObjects({
                    Bucket: _this.bucketName,
                    Delete: {
                        Objects: objects
                    }
                }, function(err, data) {
                    if(err) {
                        base.alertError(err.message);
                        return;
                    }
                    _this.loadTable();
                    $("#selected").val('');
                });
            });
            // create directory
            $('#addBtn').click(function() {
                $('#newDirModal').modal('show');
            });
            $('#newDirModal').on('shown.bs.modal', function () {
                $('#newDir').focus();
            });
            $('#newDirSubmit').click(function() {
                var dir = _this.prefix + $('#newDir').val() + '/';
                $('#newDirModal').modal('hide');
                base.s3.putObject({
                    Bucket: _this.bucketName,
                    Key: dir
                }, function(err, data) {
                    if(err) {
                        base.alertError(err.message);
                        return;
                    }
                    _this.loadTable();
                });
            });
            // change current location
            var changePrefix = function() {
                var prefix = $(this).attr('data-prefix');
                if(prefix === null || prefix === undefined) return;
                _this.prefix = prefix;
                _this.loadTable();
            };
            $('.path').on('click', '.changePrefix', changePrefix);
            $('tbody').on('click', '.changePrefix', changePrefix);
        },
        getBucketName: function(url) {
            var reg = new RegExp('(\\?|&)' + "bucket" + '=([^&?]*)', 'i');
            var arr = url.match(reg);
            if (arr) {
                return arr[2];
            }
            return null;
        },
        cleanUploads: function() {
            var _this = this;
            for(var file in _this.uploaders) {
                if(!_this.uploaders.hasOwnProperty(file)) continue;
                var uploader = _this.uploaders[file];
                if(uploader.service.config.params.UploadId) { // files being uploaded with multi-part
                    uploader.service.abortMultipartUpload().send();
                } else {
                    uploader.abort();
                }
            }
        },
        calcSize: function(size) {
            if (size < 1024) return size + "B";
            else if (size < Math.pow(1024, 2)) return (size / 1024).toFixed(2) + "KB";
            else if (size < Math.pow(1024, 3)) return (size / 1024 / 1024).toFixed(2) + "MB";
            else if (size < Math.pow(1024, 4)) return (size / 1024 / 1024 / 1024).toFixed(2) + "GB";
            else return (size / 1024 / 1024 / 1024 / 1024).toFixed(2) + "TB";
        },
        uploadOneObject: function(file) {
            var _this = this;
            var filename = file.name;

            // add file to upload status list
            var demo = $(".file_entry.demo").clone().removeClass("demo hide");
            demo.find(".name_text").text(file.name).attr("title", file.name);
            demo.find(".file_size").text(_this.calcSize(file.size));
            demo.addClass('status_uploading');
            demo.data('uploadKey', filename);
            $("#uploadList").prepend(demo);

            var uploader = base.s3.upload(
                {Bucket: _this.bucketName, Key: _this.prefix + filename, Body: file},
                {
                    partSize: 5*1024*1024,
                    queueSize: 10,
                    leavePartsOnError: true
                }
            );
            _this.uploaders[filename] = uploader;
            uploader.sendCallback = function(err, data) {
                if(err) {
                    if(err.code != "RequestAbortedError") {
                        demo.attr('class', 'file_entry status_error');
                        base.alertError('Upload error: ' + err.message);
                    }
                    console.log('ERROR', err);
                    return;
                }
                base.s3.putObjectAcl({
                    Bucket: _this.bucketName,
                    Key: _this.prefix + filename,
                    ACL: acl
                }, function(err, data) {
                    if(err) {
                        base.alertError('Failed to set ACL for "' + filename +'": ' + err);
                    }
                });
                demo.attr('class', 'file_entry status_success');
                demo.find('.process').css('opacity', 0);
                delete _this.uploaders[filename];
                _this.loadTable();
            };
            uploader.send(uploader.sendCallback);
            uploader.on('httpUploadProgress', function(progress) {
                var percent = 100 * progress.loaded / progress.total;
                demo.find('.process').css('width', String(percent)+'%');
                if(percent > 100) {
                    demo.attr('class', 'file_entry status_completing');
                }
            });
        },
        renderPath: function() {
            var _this = this;
            var doms = [];
            doms.push('<a href="/buckets.html">' +
                '<span class="pathSlice pointer link_color">All Buckets</span></a>');
            doms.push('<span class="pathSlice">/</span>');
            doms.push('<span class="pathSlice pointer link_color changePrefix" data-prefix="">'
                + _this.bucketName + '</span>');
            var pathBox = $('.path');
            if(_this.prefix === '') {
                pathBox.html(doms);
                return;
            }
            var prefixes = _this.prefix.split('/');
            var prefixSoFar = '';
            for(var i = 0; i < prefixes.length; i++) {
                doms.push('<span class="pathSlice">/</span>');
                doms.push('<span class="pathSlice pointer link_color changePrefix" data-prefix="' +
                    prefixSoFar+prefixes[i]+'/' + '">' + prefixes[i] + '</span>');
                prefixSoFar += prefixes[i] + '/';
            }
            pathBox.html(doms);
        },
        loadTable: function() {
            $('#loading').show();
            var _this = this;
            _this.renderPath();
            base.s3.listObjects({
                Bucket: _this.bucketName,
                Delimiter: '/',
                Prefix: _this.prefix
            }, function(err, data) {
                if(err) {
                    base.alertError('Failed to list objects: ' + err.message);
                    console.log(err);
                    return;
                }
                var tableData = [];
                data.CommonPrefixes.forEach(function(dir, index) {
                    var dirName = dir.Prefix.slice(_this.prefix.length, dir.Prefix.length-1);
                    if(dirName === '') return;
                    return tableData.push([dir.Prefix, dirName, null, 'Directory', null]);
                });
                data.Contents.forEach(function(file, index) {
                    var fileName = file.Key.slice(_this.prefix.length);
                    if(fileName === '') return;
                    tableData.push([file.Key, fileName, file.Size, 'File', file.LastModified]);
                });
                var table = $('.dataTable').DataTable();
                table.clear();
                table.rows.add(tableData);
                table.draw();
                $('#loading').hide();
            })
        },
        getDownloadUrl: function(filename) {
            var parser = document.createElement('a');
            parser.href = AWS.config.endpoint;
            //     http:              //   s3.amazonaws.com:1234 / bucket name       /    xxx
            return parser.protocol + '//' + parser.host + '/' + this.bucketName + '/' + filename
        },
        formatTable: function () {
            var _this = this;
            $(".dataTable").show();
            return $(".dataTable").DataTable({
                bSort: false,
                aLengthMenu: [[5, 10, 15, -1], [10, 20, 50, "All"]],
                iDisplayLength: 10,
                sPaginationType: "simple_numbers",
                sDom: "<'rouid'<'fl'l><'fr'f>r>t<'row-fluid'<'fl'i><''p>>",
                "oLanguage": {
                    sEmptyTable: '',
                    sInfoEmpty: '',
                    sZeroRecords: ''
                },
                sEmptyTable: '',
                columnDefs: [{
                    targets: 0,
                    render: function(k) {
                        return '<input type="checkbox" class="chkItem" data-id="'+ k +'"/>';
                    }
                }, {
                    targets: 1,
                    render: function(name, type, row, meta) {
                        if(row[3] === 'Directory') {
                            return '<div class="col-sm-6 link_color ui-p-0 pointer changePrefix" ' +
                                'data-prefix="' + row[0] + '">' + name + '</div>';
                        } else {
                            return '<a href="' + _this.getDownloadUrl(row[0]) +
                                '"><div class="col-sm-6 link_color ui-p-0 pointer download">' +
                                name + '</div></a>'
                        }
                    }
                }, {
                    targets: 2,
                    render: function(size) {
                        if(!size) return '';
                        return _this.calcSize(size);
                    }
                }, {
                    targets: 4,
                    render: function(time) {
                        if(!time) return '';
                        return base.formatDate(time, 'yyyy-MM-dd hh:mm:ss');
                    }
                }, {
                    targets: '_all',
                    orderable: false
                }]
            });
        }
    };

    upload_fn.init();
    return upload_fn;
});
