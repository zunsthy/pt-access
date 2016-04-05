var gulp = require('gulp');
var less = require('gulp-less');
var path = require('path');

var config = {
    src: {
        styles: './web/*.less'
    },
    dst: {
        styles: './web'
    }
};

gulp.task('default', ['watch']);

gulp.task('less', function(){
    return gulp.src(config.src.styles)
    .pipe(less())
    .pipe(gulp.dest(config.dst.styles)); 
});

gulp.task('watch', function(){
    gulp.watch(config.src.styles, ['less']);
});
