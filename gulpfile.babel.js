'use strict'

import gulp from 'gulp';
import less from 'gulp-less';

const config = {
  less: {
    src: 'web/*.less',
    dst: 'web/', 
  }
};

gulp.task('less', () => gulp
  .src(config.less.src)
  .pipe(less({ style: 'compressed' }))
  .pipe(gulp.dest(config.less.dst))
);

gulp.task('watch', () => {
  gulp.watch(config.less.src, ['less']);
});

gulp.task('default', ['less', 'watch']);
