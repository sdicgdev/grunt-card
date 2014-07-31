/*
 * grunt-card
 * https://github.com/sdicgdev/grunt-card
 *
 * Copyright (c) 2014 Evan Short
 * Licensed under the MIT license.
 */

'use strict';
var _ = require('underscore');

module.exports = function(grunt, exec) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		gittag: {
			release:{
				options:{
					tag: '',
					message: ''
				}
			}
		},
		gitpush: {
			release:{
			},
			releaseTags:{
				options:{
					tags: true
				}
			},
			remove:{
			},
			origin:{
				options:{
					upstream: true
				}
			},
		},
		gitcommit: {
			describe: {
				files: {
					src: ['etc/branch_description.json']
				},
				options:{
					message: 'describing the current branch'
				}
			}
			, release: {
				files: {
					src: ['package.json', 'bower.json']
				},
				options:{
					message: 'updating version numbers'
				}
			}
		},
		gitcheckout: {
			branch: {
				options: {
					create: true
				}
			},
			dev: {
				options: {
					branch: 'dev'
				}
			},
			deploy: {
				options: {
					create: false
				}
			}
		},
		gitpull: {
			dev: {
				options: {
					branch: 'dev'
				}
			}
		},
		gitmerge: {
			noted: {
			 }
		},
		prompt: {
			whichCard: {
				options: {
					questions: [
						{
							config: 'gitcheckout.branch.options.branch',
							type: 'list',
							message: "Which branch would you like to review?",
							choices: function(answers){
								return grunt.config('prompt.whichCard.options.branches');
							}
						}
					]
				}
			}
			, startCard: {
				options: {
					questions: [
						{
							config:   'cardDescription',
							type:     'input',
							message:  "What are you working on?"
						},
						{
							config: 'cardType',
							type: 'list',
							message: "What kind of card is it?",
							default: 'feature',
							choices: ['feature', 'bug', 'operations', 'design', 'other']
						}
					]
				}
			},
		}
		, bump: {
			options: {
				updateConfigs: [],
				commit: true,
				commitFiles: ['.'], 
				createTag: true,
				tagName: '%VERSION%', 
				tagMessage: 'Release %VERSION%', // updated by approval process
				push: true,
				pushTo: 'origin',
				gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d'
			}
		},
	});

	grunt.registerTask('card', 'start a new card', 
		[ 'prompt:startCard'     // ask what the user is working on
		, 'gitcheckout:dev'    // check out dev
		, 'gitpull:dev'        // pull dev
		, 'card:start'         // perform git operations to begin a new card
		, 'gitcheckout:branch' // check out the branch
		, 'card:describe'      // create file in repo to describe the current branch
		, 'gitcommit:describe' // commit description to new branch
		]
	);

	grunt.registerTask('card:submit', 'submit what you are working on for review',
		[ 'branch:note'
		, 'gitcheckout:dev' // check out dev
		, 'gitpull:dev' // pull dev
		, 'branch:review' // merge in the random branch
		, 'gitcheckout:branch'
		, 'gitmerge:noted'
		, 'gitpush:origin'
		, 'gitcheckout:dev' // check out dev
		, 'branch:remove'
		]
	);

	grunt.registerTask('card:review', 'choose a card to review',
		[ 'gitcheckout:dev' 
		, 'gitpull:dev' 
		, 'card:find:review' // find public branches with the prefix review_
		, 'prompt:whichCard' // choose from those branches
		, 'gitcheckout:branch' // check out review branch
		]
	);

	grunt.registerTask('card:approve', 'send a branch back for more work',
		[ 'branch:note:review'
		, 'branch:removalPrep'
		, 'branch:approve' 
		, 'gitcommit:describe' // commit description to new branch
		, 'gitcheckout:dev' // check out dev
		, 'gitpull:dev' // pull dev
		, 'gitmerge:noted'
		, 'bump'
		, 'gitpush:release'
		, 'gitpush:remove'
		, 'branch:remove'
		]
	);

	grunt.registerTask('card:find', 'find cards that are ready for review', function(tag){
		grunt.config.set('gitcheckout.branch.options.create', false);
		var done = this.async();
		grunt.util.spawn(
			{ cmd: 'git'
			, args: [ 'branch', '-r']
			}
			, function(err, result, code){
				var  regx = new RegExp("^\\s*"+tag+"_")
				   , endRay = [];
				result = result.stdout.split("\n");
				result.forEach(function(item, k, ray){
					item = item.replace('origin/', '');
					if(item.match(regx)){
						endRay.push({name: item.trim()});
					}
				});
				grunt.config.set('prompt.whichCard.options.branches', endRay);
				done();
			}
		)
	});


	grunt.registerTask('card:start', 'perform git operations to begin a new card', function(){
		// start and check out a new branch whose name is based on user's answer
		var branchTitle = grunt.config('cardDescription')
	    , branchType  = grunt.config('cardType');

		// set the branch title
		grunt.config.set('gitcheckout.branch.options.branch', makeBranchName(branchType, branchTitle));
	});

	grunt.registerTask('card:describe', 'create file in repo to describe the current branch', function(){
		var branchDescription = 
		    	{ title: grunt.config('cardDescription')
		    	, type: grunt.config('cardType')
		    	}

		grunt.file.write('./etc/branch_description.json', JSON.stringify(branchDescription , null, "\t"))
	});

	grunt.registerTask('branch', 'create and merge random branches to and from dev', function(merge, place){
		var branch, name, done
		switch(merge){
			case 'approve':
				branch = grunt.config('branchInfo');
				name =  branch.title+" ("+branch.type+")";
				done = this.async();
				// read options to determine which files should be bumped
				grunt.config.set('bump.options.commitMessage', name);
				grunt.config.set('bump.options.tagMessage',  name);
				grunt.file.delete('./etc/branch_description.json');
				grunt.util.spawn(
					{ cmd: 'git'
					, args: [ 'add', './etc/branch_description.json', '-A']
					}
					, function(err, result, code){
						done();
					}
				);
				break;
			case 'removalPrep':
				branch = grunt.config('branchInfo');
				grunt.config.set('gitpush.remove.options.branch', ':'+makeBranchName('review', branch.title, branch.type));
				break;
			case 'remove':
				done = this.async();
				branch = grunt.config('branchInfo');
				grunt.util.spawn(
					{ cmd: 'git'
					, args: [ 'br', '-D', makeBranchName('review', branch.title, branch.type), makeBranchName(branch.type, branch.title)]
				
					}
					, function(err, result, code){
						done();
					}
				);
				break;
			case 'note':
				branch = grunt.file.readJSON('./etc/branch_description.json');;
				if(place=="review"){
					name = makeBranchName('review', branch.title, branch.type);
				}else{
					name = makeBranchName(branch.type, branch.title);
				}
				grunt.config.set('branchInfo', branch);
				grunt.config.set('gitmerge.noted.options.branch', name);
				break;
			case 'review':
				branch = grunt.config('branchInfo');
				name   = makeBranchName('review', branch.title, branch.type);
				grunt.config.set('gitcheckout.branch.options.branch', name);
				grunt.config.set('gitpush.origin.options.branch', name);
				break;
			default:
				break;
		}
	});

	grunt.registerTask('card:log', 'see history of approved cards', function(vmatch){
		// show changelog of approved cards
		var item;
		function compare(a, b) {
			a = a.version;
			b = b.version;
			if (a === b) {
				return 0;
			}

			var a_components = a.split(".");
			var b_components = b.split(".");
			var len = Math.min(a_components.length, b_components.length);

			// loop while the components are equal
			for (var i = 0; i < len; i++) {
				// A bigger than B
				if (parseInt(a_components[i]) > parseInt(b_components[i])) {
					return 1;
				}

				// B bigger than A
				if (parseInt(a_components[i]) < parseInt(b_components[i])) {
					return -1;
				}
			}

			// If one's a prefix of the other, the longer one is greater.
			if (a_components.length > b_components.length) {
				return 1;
			}

			if (a_components.length < b_components.length) {
				return -1;
			}

			// Otherwise they are the same.
			return 0;
		}

		var done = this.async()
		grunt.util.spawn({cmd: "git", args: ["tag", "-l", "-n1"]}, function(err, result, code){
			result = result.stdout.split("\n");
			result = _.map(result, function(obj){
				//obj.split("\t");
				obj = obj.match(/(\d*\.\d*\.\d*\S*)\s(.*)/);
				return {version: obj[1], description: obj[2].trim()}
			});

			result.sort(compare);

			for(item in result){
				if(!result[item]['version'].match(/\d*\.\d*\.\d*\S*-/) && (!vmatch || result[item]['version'].match('^'+vmatch))){;
					console.log(result[item]['version']+"\t"+result[item]['description']);
				}
			}
			done();
		});
	});
};

function camelCaseSentence(input){
	input = input.split(" ");

	input.forEach(function(item, k, ray){
		ray[k] = item.charAt(0).toUpperCase() + item.substring(1);
	});

	return input.join("");
}

function makeBranchName(type, title, descriptor){
	var result = type+"_"+camelCaseSentence(title);  
	if(descriptor){
		result += "_"+descriptor;
	}
	return result;
}
