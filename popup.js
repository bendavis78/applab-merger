var $ = document.querySelector.bind(document);
var url;

function selectProject() {
  $('#selectScreen').style.display = 'none';
  $('#merge').style.display = 'none';
  getScreens(this.value, function() {
    $('#selectScreen').style.display = 'block';
  });
}

function selectScreen() {
  $('#merge').style.display = 'block';
  $('#mergeBtn').textContent = 'Copy ' + this.value + ' to current project';
  console.log($('#mergeBtn'));
}

function getTab(cb) {
  chrome.tabs.getSelected(null, cb);
}

function getCurrentProjectId(cb) {
  getTab(function(tab) {
    var projectId = tab.url.match(/projects\/applab\/([^/]+)/)[1];
    cb(projectId);
  })
}

function getProjects(currentProject, cb) {
  // get channels
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var sel = $('#projectId');
        sel.addEventListener('change', selectProject);
        data = JSON.parse(xhr.responseText);
        data.sort(function(a, b) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        data.forEach(function(item) {
          if (item.id !== currentProject) {
            opt = document.createElement('option');
            opt.setAttribute('value', item.id);
            opt.textContent = item.name || 'Untitled Project';
            sel.appendChild(opt);
          }
        });
        sel.value = '';
        if (cb) {
          cb();
        }
      } else {
        console.error(xhr);
        throw new Error('Could not get channels');
      }
    }
  };
  xhr.open('GET', 'https://studio.code.org/v3/channels', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send();
}

function getProject(projectId, cb) {
  var url = 'https://studio.code.org/v3/sources/' + projectId + '/main.json';
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var sel = $('#screenId');
        sel.addEventListener('change', selectScreen);
        data = JSON.parse(xhr.responseText);
        cb(data);
      } else {
        console.error(xhr);
        throw new Error('Could not get channels');
      }
    }
  };
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send();
}

function updateProject(projectId, data, cb) {
  var url = 'https://studio.code.org/v3/sources/' + projectId + '/main.json';
  var body = JSON.stringify(data);

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        cb(data);
      } else {
        console.error(xhr);
        throw new Error('Could not get channels');
      }
    }
  };
  xhr.open('PUT', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send(body);
}

function getScreens(projectId, cb) {
  console.log('Getting screens for projectId %s', projectId);
  $('#merge').style.display = 'none';
  getProject(projectId, function(project) {
    var sel = $('#screenId');
    var html = document.createElement('html');
    html.innerHTML = project.html;
    var screens = html.querySelectorAll('.screen');
    console.debug(screens);
    sel.innerHTML = sel.options[0].outerHTML;
    for (var i=0; i<screens.length; i++) {
      opt = document.createElement('option');
      opt.setAttribute('value', screens[i].id);
      opt.textContent = screens[i].id;
      sel.appendChild(opt);
    }
    sel.value = '';
    if (cb) {
      cb();
    }
  });
}

function merge() {
  var projectId = $('#projectId').value;
  var screenId = $('#screenId').value;

  $('#start').style.display = 'none';
  $('#copying').style.display = 'block';

  getCurrentProjectId(function(currentProjectId) {
    getProject(currentProjectId, function(currentProject) {
      getProject(projectId, function(copyProject) {
        var html = document.createElement('html');
        html.innerHTML = currentProject.html;
        var container = html.querySelector('#designModeViz');
        var currentScreen = html.querySelector('#'+ screenId);

        var copyHtml = document.createElement('html');
        copyHtml.innerHTML = copyProject.html;
        var copyScreen = copyHtml.querySelector('#' + screenId);

        if (currentScreen) {
          container.replaceChild(copyScreen, currentScreen)
        } else {
          container.appendChild(copyScreen);
        }

        currentProject.html = html.outerHTML;
        updateProject(currentProjectId, currentProject, function(result) {
          console.debug('Project updated: ', result);
          $('#copying').style.display = 'none';
          $('#result').style.display = 'block';
          getTab(function(tab) {
            setTimeout(function() {
              chrome.tabs.reload(tab.id);
            }, 1000);
          })
        });
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('loaded applab merger');

  getCurrentProjectId(function(projectId) {
    getProjects(projectId);
  });
  $('#projectId').addEventListener('change', selectProject);
  $('#screenId').addEventListener('change', selectScreen);
  $('#mergeBtn').addEventListener('click', merge);
});
