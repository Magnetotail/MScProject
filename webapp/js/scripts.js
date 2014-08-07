/*jshint strict: false */

var PAGE_SIZE = 10;
var MAX_NODES_VIEWABLE = 500;
var MAX_EDGES_VIEWABLE = 200;
var MAX_FILESIZE = 50 * 1000 * 1000;
var FILESIZE_NEEDING_PROGRESSBAR = 250* 1000;

var viewModel = function() {
    var self = this;

    self.graph = ko.observable();

    self.cy = ko.observable();

    self.community = ko.observableArray();

    self.loadingGraph = ko.observable(false);

    self.currentViewTooBig = ko.observable(false);

    // HISTORY ----------------------------------------------------------------------- //
    self.viewHistory = ko.observableArray();

    self.hasHistory = ko.computed( function() {
        return self.viewHistory().length > 0;
    });

    self.isShowingCommunity = ko.observable(false);

    self.currentCommunityShown = ko.computed( function() {
        if (self.viewHistory().length > 0) {
            return self.viewHistory()[self.viewHistory().length - 1].community;
        }
    });

    self.currentColourLevel = ko.computed( function() {
        if (self.viewHistory().length > 0) {
            return self.viewHistory()[self.viewHistory().length - 1].colourLevel;
        }
    });

    self.backHistory = function() {
        var currentView = self.viewHistory.pop();
        var previousView;
        if (self.viewHistory().length > 0) {
            previousView = self.viewHistory.pop();
            self.viewHistory.push(previousView);
        } else {
            previousView = new ViewId(self.hierarchyHeight(), self.hierarchyHeight(), self.hierarchyHeight(), -1);
        }
        if (previousView.community === -1) {
            self.updateGraphWithAjax(previousView);
        } else {
            self.updateCommunityGraphWithAjax(previousView);
        }
    };

    // RESULTS ----------------------------------------------------------------------- //
    self.allModularities = ko.computed( function() {
        return self.graph() ? self.graph().modularities : '';
    });

    self.metadata = ko.computed( function() {
        return self.graph() ? self.graph().metadata : '';
    });

    self.hierarchyHeight = ko.computed(function() {
        return self.metadata().hierarchyHeight;
    });

    self.currentLevel = ko.computed(function() {
        return self.metadata().currentLevel;
    });

    self.selectedCommunity = ko.observable();

    self.hasSelectedCommunity = ko.computed(function() {
        return self.selectedCommunity() && self.selectedCommunity() !== -1 && !self.isBottomLevel();
    });

    self.updateSelectedCommunity = function() {
        if (self.cy()) {
            if (self.cy().$('node:selected').length === 1) {
                self.selectedCommunity(cy.$('node:selected')[0].id());
            } else {
                self.selectedCommunity(-1);
            }
        }
    };

    self.drillLevel = ko.observable();

    self.isBottomLevel = ko.computed(function() {
        return self.drillLevel() === 0;
    });

    self.modularity = ko.computed(function() {
        var modularity = (self.drillLevel() === 0) ? 0 : self.allModularities()[self.drillLevel() - 1];
        if (modularity || modularity === 0) {
            return modularity.toFixed(2);
        }
    });

    self.colourLevel = ko.observable();

    self.levelsArray = ko.computed( function() {
        var levels = [];
        for (var i = 0; i <= self.hierarchyHeight(); i++) {
                levels.push(i);
        }
        return levels;
    });

    self.availableLevels = ko.computed(function() {
        self.drillLevel(self.currentLevel());
        return self.levelsArray().slice(0, self.hierarchyHeight() + 1);
    });

    self.colourLevels = ko.computed(function() {
        self.colourLevel(self.hierarchyHeight() + 1);
        var from = Math.max(self.drillLevel(), 1);
        return self.levelsArray().slice(from, self.hierarchyHeight() + 1);
    });

    self.communityDrillLevel = ko.observable();

    self.communityColourLevel = ko.observable();

    self.communityAvailableLevels = ko.computed(function() {
        self.communityDrillLevel(self.currentLevel() - 1);
        return self.levelsArray().slice(0, self.currentLevel());
    });

    self.communityColourLevels = ko.computed(function() {
        self.colourLevel(self.hierarchyHeight() + 1);
        var from = Math.max(self.communityDrillLevel(), 1);
        return self.levelsArray().slice(from, self.hierarchyHeight() + 1);
    });


    // NODE LABELS ----------------------------------------------------------------------- //
    self.hasLabels = ko.observable(false);

    self.nodeDataChoice = ko.observable();

    self.availableNodeData = ko.computed(function() {
        self.nodeDataChoice('off');
        var options = [];
        options.push('off');
        if (self.graph()) {
            var metadata = self.graph().nodes[0].data.metadata;
            for (var key in metadata) {
               options.push(key);
            }
        }
        return options;
    });

    self.updateLabels = ko.computed(function() {
         if (self.hasLabels()) {
            self.cy().style().selector('node').css('content', 'data(metadata.' + self.nodeDataChoice() + ')').update();
        }
    });

    self.toggleLabels = function() {
        if (self.nodeDataChoice() === 'off') {
            self.cy().style().selector('node').css('content', '').update();
        } else {
            self.cy().style().selector('node').css('content', 'data(metadata.' + self.nodeDataChoice() + ')').update();
        }
    };

     self.refreshLabels = function() {
        if (self.hasLabels()) {
            self.cy().style().selector('node').css('content', 'data(metadata.' + self.nodeDataChoice() + ')').update();
        }
    };

    // DISPLAY OPTIONS ----------------------------------------------------------------------- //
    self.layoutOptions = ['Force-directed', 'Grid', 'Breadth-first', 'Circle'];

    self.layoutChoice = ko.observable('Force-directed');

    self.layoutTime = ko.observable(10);

    self.isArborRunning = ko.observable(false);

    self.cancelLayoutStatus = ko.observable(false);

    self.layoutChoiceComputed = ko.computed(function() {
        if (self.layoutChoice() === 'Force-directed') {
            self.cancelLayoutStatus(false);
            if (self.drillLevel() > 0) {
                return arborLayout(self.layoutTime());
            } else {
                return defaultArborLayout(self.layoutTime());
            }
        } else if (self.layoutChoice() === 'Grid') {
            return gridLayout();
        } else if (self.layoutChoice() === 'Breadth-first') {
            return breadthfirstLayout();
        } else {
            return circleLayout();
        }
    });

    self.usesArborLayout = ko.computed(function() {
        return self.layoutChoice() === 'Force-directed';
    });

    self.cancelLayout = function() {
        self.cancelLayoutStatus(true);
    };

    self.refreshLayout = function() {
        self.cy().layout(self.layoutChoiceComputed());
    };

    // UPLOAD ----------------------------------------------------------------------- //
    self.fileValue = ko.observable();

    self.hasAddedFile = ko.observable(false);

    self.addedFile = function() {
        self.fileValue($('input[type=file]').val());
        if (self.fileValue()) {
            if ($('#fileInput')[0].files[0].size > MAX_FILESIZE) {
                alertify.alert('This file is too big. Files larger than 50mb currently not supported.');
                self.hasAddedFile(false);
            } else {
                self.hasAddedFile(true);
            }
        } else {
            self.hasAddedFile(false);
        }
    };

    self.intervalId = 0;

    self.uploadGraph = function() {
        var filesize = $('#fileInput')[0].files[0].size;
        if (filesize > FILESIZE_NEEDING_PROGRESSBAR) {
            self.loadingGraph(true);
            var percentComplete = 0;
            progress(percentComplete, $('#progressBar'));
            var increment = 5000000 / filesize;
            self.intervalId = setInterval(function() {
                percentComplete = percentComplete + increment;
                progress(percentComplete, $('#progressBar'));
                var remaining = 100 - percentComplete;
                if (remaining < 20) {
                    increment = remaining / 20;
                }
            }, 100);
        }
        self.selectedCommunity(-1);
        self.isShowingCommunity(false);
        var formData = new FormData($('form')[0]);
        graphRequest('ProcessGraph', formData, false, false, initialiseGraph);
    };

    self.finishLoading = ko.computed( function() {
        if (!self.loadingGraph()) {
            clearInterval(self.intervalId);
        }
    });

    self.updateGraphWithAjax = function(view) {
        var formData = 'graphLevel=' + view.drillLevel;
        formData += '&colourLevel=' + view.colourLevel;
        var dataFunction = initialiseGraph;
        if (self.currentLevel() === view.drillLevel) {
            dataFunction = refreshColours;
            formData += '&includeEdges=' + encodeURIComponent('false');
        } else {
            formData += '&includeEdges=' + encodeURIComponent('true');
        }
        self.selectedCommunity(-1);
        graphRequest('UpdateGraph', formData, true, 'application/x-www-form-urlencoded', dataFunction);
        self.currentViewTooBig(false);
        self.isShowingCommunity(false);
    };

    self.updateCommunityGraphWithAjax = function(view) {
        var formData = 'graphLevel=' + encodeURIComponent(view.drillLevel);
        formData += '&colourLevel=' + encodeURIComponent(view.colourLevel);
        formData += '&currentLevel=' + encodeURIComponent(view.currentLevel);
        formData += '&selectedNode=' + encodeURIComponent(view.community);
        formData += '&includeEdges=' + encodeURIComponent('true');
        self.selectedCommunity(-1);
        graphRequest('UpdateGraph', formData, true, 'application/x-www-form-urlencoded', initialiseGraph);
        self.currentViewTooBig(false);
        self.isShowingCommunity(true);
    };

    self.isCommunityTooBig = ko.observable(true);

    self.updateIsCommunityTooBig = ko.computed( function() {
        if (self.graph() && !self.isBottomLevel() && self.hasSelectedCommunity()) {
            var formData = 'graphLevel=' + encodeURIComponent(self.communityDrillLevel());
            formData += '&currentLevel=' + encodeURIComponent(self.currentLevel());
            formData += '&selectedNode=' + encodeURIComponent(self.selectedCommunity());
            $.ajax({
                type: 'GET',
                url: 'GetCommunitySize',
                data: formData,
                cache: false,
                success: function(data){
                    if (data < MAX_EDGES_VIEWABLE) {
                        self.isCommunityTooBig(false);
                    } else {
                        self.isCommunityTooBig(true);
                    }
                }
            });
        }
    });

    self.updateGraph = function(obj, event) {
        if (event.originalEvent) {
            var view = new ViewId(self.drillLevel(), self.colourLevel(), self.currentLevel(), -1);
            if ((self.drillLevel() || self.drillLevel() === 0) && self.drillLevel() !== -1) {
                $.ajax({
                    type: 'GET',
                    url: 'GetLevelSize',
                    async: false,
                    data: 'graphLevel=' + encodeURIComponent(self.drillLevel()),
                    cache: false,
                    success: function(data){
                        if (data < MAX_NODES_VIEWABLE) {
                            self.viewHistory.push(view);
                            self.updateGraphWithAjax(view);
                        } else {
                            self.currentViewTooBig(true);
                        }
                    }
                });
            } else {
                self.currentViewTooBig(true);
            }
        }
    };

    self.updateCommunity = function() {
        var view = new ViewId(self.communityDrillLevel(), self.communityColourLevel(), self.currentLevel(), self.selectedCommunity());
        self.viewHistory.push(view);
        self.updateCommunityGraphWithAjax(view);
    };

    self.downloadGraph = function() {
        var formData = 'graphLevel=' + encodeURIComponent(self.drillLevel());
        formData += '&colourLevel=' + encodeURIComponent(self.colourLevel());
        formData += '&includeEdges=' + encodeURIComponent('true');
        self.selectedCommunity(-1);
        window.location = 'DownloadGraph?' + formData;
    };

    self.downloadCommunity = function() {
        var formData = 'graphLevel=' + encodeURIComponent(self.drillLevel());
        formData += '&colourLevel=' + encodeURIComponent(self.colourLevel());
        formData += '&currentLevel=' + encodeURIComponent(self.currentLevel());
        formData += '&selectedNode=' + encodeURIComponent(self.selectedCommunity());
        formData += '&includeEdges=' + encodeURIComponent('true');
        self.selectedCommunity(-1);
        window.location = 'DownloadGraph?' + formData;
    };

    self.updateCommunityTable = ko.computed(function() {
        if (self.hasSelectedCommunity() && !self.isBottomLevel() && self.drillLevel()) {
            var formData = 'graphLevel=' + encodeURIComponent(0);
            formData += '&colourLevel=' + encodeURIComponent(self.hierarchyHeight());
            formData += '&currentLevel=' + encodeURIComponent(self.currentLevel());
            formData += '&selectedNode=' + encodeURIComponent(self.selectedCommunity());
            formData += '&includeEdges=' + encodeURIComponent('true');
            graphRequest('UpdateGraph', formData, true, 'application/x-www-form-urlencoded', setCommunity);
        } else {
            self.community([]);
        }
    });

    // COMMUNITY TABLE ----------------------------------------------------------------------- //
    self.tableHeadings = ko.observableArray();

    self.computeTableHeadings = ko.computed(function() {
        var headings = [];
        if (self.community().length > 0 && self.community()[0].data.metadata) {
            var metadata = self.community()[0].data.metadata;
            for (var key in metadata) {
                if (key != 'community') {
                    headings.push(key);
                }
            }
        }
        self.tableHeadings(headings);
    });

    self.communityPageIndex = ko.observable(1);

    self.communityNoOfPages = ko.computed( function() {
        self.communityPageIndex(1);
        return Math.floor((self.community().length - 1) / PAGE_SIZE) + 1;
    });

    self.isFirstPage = ko.computed( function() {
        return self.communityPageIndex() === 1;
    });

    self.isLastPage = ko.computed( function() {
        return self.communityPageIndex() === self.communityNoOfPages();
    });

    this.pagedCommunity = ko.computed(function() {
        var startIndex = (self.communityPageIndex()-1) * PAGE_SIZE;
        var endIndex = startIndex + PAGE_SIZE;
        var page = self.community().slice(startIndex, endIndex);
        page.forEach( function (node) {
            delete node.data.metadata.community;
        });
        return page;
    });

    self.nextPage = function() {
        self.communityPageIndex(self.communityPageIndex() + 1);
    };

    self.previousPage = function() {
        self.communityPageIndex(self.communityPageIndex() - 1);
    };

    self.firstPage = function() {
        self.communityPageIndex(1);
    };

    self.lastPage = function() {
        self.communityPageIndex(self.communityNoOfPages());
    };

    // HELP ------------------------------------------------------------------------------- //
    self.showHelp = ko.observable(false);

    self.turnHelpOn = function() {
        self.showHelp(true);
        alertify.alert('Hover over the ? arrows to view help information.');
    };

    self.turnHelpOff = function() {
        self.showHelp(false);
    };
};

viewModel = new viewModel();

ko.applyBindings(viewModel);

function ViewId(drillLevel, colourLevel, currentLevel, community) {
    this.drillLevel = drillLevel;
    this.colourLevel = colourLevel;
    this.currentLevel = currentLevel;
    this.community = community;
}

var graphRequest = function(url, formData, processData, contentType, dataFunction) {
    $.ajax({
        type: 'POST',
        url: url,
        data: formData,
        processData: processData,
        contentType: contentType,
        dataType: 'json',
        cache: false,

        success: function( data, textStatus, jqXHR) {
            if(data.success) {
                dataFunction(data);
            } else {
                alertify.alert('There was a problem: <br><br>' + data.error);
                clearCy();
                viewModel.graph(false);
                viewModel.cancelLayoutStatus(true);
            }
        },

        beforeSend: function(jqXHR, settings) {
            $('#uploadButton').attr('disabled', true);
            alertify.success('Processing request...');
        },

        complete: function(jqXHR, textStatus){
            viewModel.loadingGraph(false);
            $('#uploadButton').attr('disabled', false);
        },

        error: function(jqXHR, textStatus, errorThrown){
            console.log('Something really bad happened ' + textStatus);
            alertify.alert('There was a problem with the server, please refresh and try again');
            clearCy();
            viewModel.graph(false);
            viewModel.cancelLayoutStatus(true);
        }
    });
};

var initialiseGraph = function(data) {
    $('.qtip').each(function(){
        $(this).data('qtip').destroy();
    });
    alertify.success('Processing complete');
    viewModel.graph(data);
    if (data.nodes.length < 500) {
        //console.log('in success: ' + JSON.stringify(data, undefined, 2));
        initCy(viewModel.graph());
    } else {
        alertify.alert('There are too many communities to display.' +
            ' GML files of this communitry structure can be downloaded through the menu on the left.');
    }
};

var setCommunity = function(data) {
    viewModel.community(data.nodes);
};

var refreshColours = function(data) {
    var nodes = data.nodes;
    nodes.forEach( function (node) {
        var id = node.data.id;
        var newColour = node.data.colour;
        var newMetadata = node.data.metadata;
        var cyNode = viewModel.cy().elements('node#' + id)[0];
        cyNode.data('colour', newColour);
        cyNode.data('metadata', newMetadata);
        cyNode.css('background-color', newColour);
    });
    alertify.success('Updated colours');
};

function progress(percent, $element) {
    var progressBarWidth = percent * $element.width() / 100;
    $element.find('div').animate({ width: progressBarWidth }, 200).html(percent + '%&nbsp;');
}