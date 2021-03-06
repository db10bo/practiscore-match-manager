/* global io, moment */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var App = {};

  App.timeFormatUTC = function (time) {
    return moment.utc (time).local ().format ('YYYY-MM-DD HH:mm:ss');
  };

  App.socketConnect = function () {
    App.socket.emit ('match:request', {options: {all: true}});

    $('#serverDisconnect').hide ();
    $('#content,#menu').show ();
  };

  App.socketDisconnect = function () {
    $('#serverDisconnect').show ();
    $('#content,#menu').hide ();
  };

  App.showDetails = function (v) {
    var r = [];
    var targetData = [
      function () {
        r.push ('<tr><td>Device</td>');
        _.eachRight (v.tmpScores, function (s) {
          r.push ('<td>' + (s.dname || '(Unknown)') + '</td>');
        });
        r.push ('</tr>');
      },
      function () {
        r.push ('<tr><td>DNF</td>');
        _.eachRight (v.tmpScores, function (s) {
          r.push ('<td>' + (s.dnf ? 'Yes' : 'No') + '</td>');
        });
        r.push ('</tr>');
      },
      function () {
        _.each (v.score.str, function (score, index) {
          r.push ('<tr><td>T' + (index + 1) + '</td>');
          _.eachRight (v.tmpScores, function (s) {
            r.push ('<td>' + s.str [index].toFixed (2) + '</td>');
          });
          r.push ('</tr>');
        });
      },
      function () {
        r.push ('<tr><td>P</td>');
        _.eachRight (v.tmpScores, function (s) {
          r.push ('<td>' + (s.proc || 0) + '</td>');
        });
        r.push ('</tr>');
      },
    ];

    _.each (targetData, function (td) {
      td ();
    });

    $('#popupdetails-content')
      .empty ()
      .append ($('<table />').attr ('id', 'detailsTable')
        .append ($('<thead />')
          .append ($('<tr />').attr ('id', 'detailsTableTheadTr')
            .append ($('<th />').text ('Item').attr ({'data-sorter': 'false'}))
          )
        )
      );

    _.eachRight (v.tmpScores, function (s) {
      $('#detailsTableTheadTr').append ($('<th />').text (App.timeFormatUTC (s.mod)).attr ({'data-sorter': 'false'}));
    });

    $('#detailsTable').append ($('<tbody />').attr ('id', 'detailsTbody'));
    $('#detailsTbody').append (r.join (''));

    $('#detailsTable').tablesorter ({
      theme: 'jui',
      widthFixed: false,
      headerTemplate: '{content} {icon}',
      emptyTo: 'none',
      widgets: ['uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
      },
    });

    $('#popupDetails').dialog ({
      width: 'auto',
      title: v.stage.stage_name + ' -- ' + (v.shooter.sh_id.length ? (v.shooter.sh_id + ' -- ') : '') + v.shooter.sh_ln + ', ' + v.shooter.sh_fn,
      dialogClass: "no-close",
      modal: true,
      draggable: true,
      resizable: false,
      buttons: {
        'Close': function () {
          $(this).dialog ('close');
        },
      },
    });

    $('#detailsTable').trigger ('update').show ();
  };

  App.showChanges = function (event) {
    var v = {};
    v.td = $(event.target).closest ('td');
    v.mshstage = $(v.td).attr ('mshstage');
    v.mshshooter = $(v.td).attr ('mshshooter');
    v.shooter = _.find (App.matchData.m.match_shooters, {'sh_uid': v.mshshooter});
    v.stage = _.find (App.matchData.m.match_stages, {'stage_uuid': v.mshstage});
    v.stageScores = _.find (App.matchData.s.match_scores, {'stage_uuid': v.mshstage});
    v.score = _.find (v.stageScores.stage_stagescores, {'shtr': v.mshshooter});
    v.msh_scores = App.matchData.s.match_scores_history [v.mshstage][v.mshshooter];
    v.tmpScores = [];

    v.tmpScores.push (v.score);
    v.tmpScores = v.tmpScores.concat (v.msh_scores);

    event.preventDefault ();

    if (!v.mshstage || !v.mshshooter || !v.shooter || !v.stage || !v.msh_scores || !v.stageScores || !v.score) {
      alert ('Eeek! Some data is missing! (See console log)');
    } else {
      $('#popupchanges-content')
        .empty ()
        .append ($('<table />').attr ('id', 'changesTable')
          .append ($('<thead />')
            .append ($('<tr />')
              .append ($('<th />').text ('Date/Time').attr ({'data-sorter': 'false'}))
              .append ($('<th />').text ('Device').attr ({'data-sorter': 'false'}))
              .append ($('<th />').text ('DNF').attr ({'data-sorter': 'false'}))
              .append ($('<th />').text ('Time').attr ({'data-sorter': 'false'}))
              .append ($('<th />').text ('Bonuses').attr ({'data-sorter': 'false'}))
              .append ($('<th />').text ('Penalties').attr ({'data-sorter': 'false'}))
            )
          ).append ($('<tbody />').attr ('id', 'changesTbody'))
        );

      //
      // FIXME: bonuses and penalties should display a popup of details
      //
      var addScoreLine = function (s) {
        var changesTbody = $('#changesTbody');
        var bonuses = 0;
        var penalties = 0;

        _.each (s.bons, function (v, index) {
          bonuses += (v * App.matchData.m.match_bonuses [index].bon_val);
        });

        _.each (s.pens, function (v, index) {
          penalties += (v *  App.matchData.m.match_penalties [index].pen_val);
        });

        $(changesTbody)
          .append ($('<tr />')
            .append ($('<td />').text (App.timeFormatUTC (s.mod)))
            .append ($('<td />').text (s.dname || '(Unknown)'))
            .append ($('<td />').text (s.dnf ? 'Yes' : 'No'))
            .append ($('<td />').text ((_.sum (s.str) || 0).toFixed (2)))
            .append ($('<td />').text (bonuses.toFixed (2)))
            .append ($('<td />').text (penalties.toFixed (2)))
          );
      };

      _.each (v.tmpScores, function (s) {
        addScoreLine (s);
      });

      $('#changesTable').tablesorter ({
        theme: 'jui',
        widthFixed: false,
        headerTemplate: '{content} {icon}',
        emptyTo: 'none',
        widgets: ['uitheme', 'zebra'],
        widgetOptions: {
          zebra: ['even', 'odd'],
        },
      });

      $('#popupChanges').dialog ({
        width: 'auto',
        title: v.stage.stage_name + ' -- ' + (v.shooter.sh_id.length ? (v.shooter.sh_id + ' -- ') : '') + v.shooter.sh_ln + ', ' + v.shooter.sh_fn,
        dialogClass: "no-close",
        modal: true,
        draggable: true,
        resizable: false,
        buttons: {
          'Details': function () {
            App.showDetails (v);
          },
          'Close': function () {
            $(this).dialog ('close');
          },
        },
      });

      $('#changesTable').trigger ('update').show ();
    }
  };

  App.matchDataReceived = function (param) {
    var newRows = '';
    var matchData = param.matchData;
    var stages = matchData.m.match_stages;
    var competitors = matchData.m.match_shooters;
    var scores = matchData.s.match_scores;
    var history = matchData.s.match_scores_history;

    App.matchData = matchData;

    if (!matchData || !matchData.s || !matchData.s.match_scores_history) {
      $('#historyTable').hide ();
      $('#historyMessage').text ('(No history available)').show ();
      return;
    }

    if (!matchData || !matchData.s || !matchData.s.match_scores) {
      $('#historyTable').hide ();
      $('#historyMessage').text ('(No scores available)').show ();
      return;
    }

    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length) {
      $('#historyTable').hide ();
      $('#historyMessage').text ('(No stages defined)').show ();
      return;
    }

    var stage;
    var competitor;
    var stageScores;
    var score;

    _.each (history, function (msh_stage, msh_stage_uuid) {
      if (!(stage = _.find (stages, {'stage_uuid': msh_stage_uuid}))) {
        alert ("Can't find stage with UUID " + msh_stage_uuid);
        console.log ("Can't find stage with UUID " + msh_stage_uuid);
      } else {
        _.each (msh_stage, function (msh_shooter, msh_shooter_uid) {
          if (!(competitor = _.find (competitors, {'sh_uid': msh_shooter_uid}))) {
            alert ("Can't find competitor with UID " + msh_shooter_uid);
            console.log ("Can't find competitor with UID " + msh_shooter_uid);
          } else {
            if (!(stageScores = _.find (scores, {'stage_uuid': msh_stage_uuid}))) {
              alert ("Can't find stage scores with UUID " + msh_stage_uuid);
              console.log ("Can't find stage scores with UUID " + msh_stage_uuid);
            } else if (!(score = _.find (stageScores.stage_stagescores, {'shtr': msh_shooter_uid}))) {
              alert ("Can't find competitor score with UID " + msh_shooter_uid);
              console.dir (stageScores);
              console.log ("Can't find competitor score with UID " + msh_shooter_uid);
            } else {
              newRows = newRows +
                '<tr>' +
                  '<td>' + stage.stage_number + '</td>' +
                  '<td>' + stage.stage_name + '</td>' +
                  '<td>' + competitor.sh_id + '</td>' +
                  '<td>' + competitor.sh_ln + ', ' + competitor.sh_fn + '</td>' +
                  '<td>' + App.timeFormatUTC (score.mod) + '</td>' +
                  '<td>' + score.dname + '</td>' +
                  '<td mshstage="' + msh_stage_uuid + '" mshshooter="' + msh_shooter_uid + '" class="tablesorter-force-link"><a href="#">' + msh_shooter.length + '</a></td>' +
                '</tr>';
            }
          }
        });
      }
    });

    $('#historyTable > tbody').empty ();
    $('#historyTable tbody').append (newRows);

    $('[mshstage] > a').off ().click (function (e) {
      App.showChanges (e);
    });

    $('#historyTable').trigger ('update').show ();
  };

  App.matchUpdated = function () {
    App.socket.emit ('match:request', {options: {match: true}});
  };

  //
  //
  //
  $.extend($.tablesorter.themes.jui, {
    table      : 'ui-widget ui-widget-content ui-corner-all',
    caption    : 'ui-widget-content ui-corner-all',
    header     : 'ui-widget-header ui-corner-all ui-state-default',
    footerRow  : '',
    footerCells: '',
    icons      : 'ui-icon',
    sortNone   : 'ui-icon-carat-2-n-s',
    sortAsc    : 'ui-icon-carat-1-n',
    sortDesc   : 'ui-icon-carat-1-s',
    active     : 'ui-state-active',
    hover      : 'ui-state-hover',
    filterRow  : '',
    even       : 'ui-widget-content',
    odd        : 'ui-state-default'
  });

  $('#historyTable th').attr ('data-placeholder', '[All]');
  $('#historyTable').tablesorter ({
    theme: 'jui',
    widthFixed: false,
    headerTemplate: '{content} {icon}',
    sortList: [
      ['.col-lastchange', 1]
    ],
    emptyTo: 'none',
    headers: {
      '.col-lastchange': {
           sorter: "isodate",
         },
    },
    widgets: ['saveSort', 'filter', 'uitheme', 'zebra'],
    widgetOptions: {
      zebra: ['even', 'odd'],
      saveSort: true,
      filter_hideFilters: true,
      filter_functions: {
         '.col-stagenumber': true,
         '.col-stagename':   true,
         '.col-memberid':    true,
         '.col-competitor':  true,
         '.col-lastchange':  false,
         '.col-device':      true,
         '.col-edits':       true,
      },
    },
  });

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.emit ('log:log', {'msg': 'Edit/View->History (TP)'});
});
