!function(){{const head=document.getElementsByTagName('HEAD')[0];const link=document.createElement('link');link.rel = 'stylesheet'; link.type = 'text/css';link.href='{console_app_url}/static/css/widget.css';head.appendChild(link);const script=document.createElement('script');script.src = '{console_app_url}/static/js/widget.js';document.head.appendChild(script);const videochat_script=document.createElement('script');videochat_script.src = '{video_app_url}/static/js/quickhellou.js';document.head.appendChild(videochat_script);document.body.insertAdjacentHTML( 'beforeend', '{template_code}')}}()