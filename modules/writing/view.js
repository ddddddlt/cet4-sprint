/*
 * 把作文模块挂进 cet4-sprint 的视图系统
 * 站点通过 A.views[viewName] 取视图，render() 会调用 mount/destroy。
 * 注意：模块的根节点放在一个内层 div 里，避免把 .wcoach 类留在站点的 #view 上，
 * 否则切到首页后，整站会继承作文模块的字体和颜色变量。
 */
window.App = window.App || {};
(function (A) {
  'use strict';

  A.views = A.views || {};

  A.views.writing = function () {
    return {
      html: '',
      mount: function (root) {
        root.innerHTML = '';
        var box = document.createElement('div');
        box.className = 'writing-host';
        root.appendChild(box);
        if (!window.WritingCoach) {
          box.innerHTML = '<div class="empty"><h3>作文模块未加载</h3><p>检查 modules/writing 下的脚本是否引入</p></div>';
          return;
        }
        window.WritingCoach.mount(box);
      },
      destroy: function () {
        if (window.WritingCoach && window.WritingCoach.unmount) {
          window.WritingCoach.unmount();
        }
      }
    };
  };
})(window.App);
