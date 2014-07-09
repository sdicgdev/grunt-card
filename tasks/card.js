/*
 * grunt-card
 * https://github.com/sdicgdev/grunt-card
 *
 * Copyright (c) 2014 Evan Short
 * Licensed under the MIT license.
 */

'use strict';

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
			origin:{
				options:{
					upstream: true
				}
			}
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
				commitFiles: ['-a'], 
				createTag: true,
				tagName: '%VERSION%', 
				tagMessage: 'Release %VERSION%', // updated by approval process
				push: true,
				pushTo: 'upstream',
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
		]
	);

	grunt.registerTask('card:review', 'choose a card to review',
		[ 'gitcheckout:dev' 
		, 'card:find:review'
		, 'prompt:whichCard'
		, 'gitcheckout:branch'
		]
	);

	grunt.registerTask('card:reject', 'send a branch back for more work', 
		[ 'card:move:fix'
		, 'gitpush:origin'
		, 'card:remove:review'
		]
	);

	grunt.registerTask('card:approve', 'send a branch back for more work',
		[ 'branch:note'
		, 'gitcheckout:dev' // check out dev
		, 'gitpull:dev' // pull dev
		, 'branch:approve' 
		, 'gitmerge:noted'
		, 'bump'
		, 'gitpush:release'
		// check that on review branch
		//
		// pull
		//
		// checkout dev
		// 
		// pull
		//
		// make approval branch
		//
		// merge in review branch
		//
		// if no errors
		//  - co dev and merge in approval branch
		//  - tag branch
		//  - delete approval branch
		//  - delete review branch
		//
		// if errors
		//  - tell user about errors
		//  - allow them to fix and re-approve
		//  - allow them to reject
		// 
		]
	);

	grunt.registerTask('card:find', 'find cards that are ready for review', function(tag){
		grunt.config.set('gitcheckout.branch.options.create', false);
		var done = this.async();
		grunt.util.spawn(
			{ cmd: 'git'
			, args: [ 'branch']
			}
			, function(err, result, code){
				var  regx = new RegExp("^\\s*"+tag+"_")
				   , endRay = [];
				result = result.stdout.split("\n");
				result.forEach(function(item, k, ray){
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


	grunt.registerTask('branch', 'create and merge random branches to and from dev', function(merge){
		var branch, name
		switch(merge){
			case 'approve':
				branch = grunt.config('branchInfo');
				name =  branch.title+" ("+branch.type+")";
				// read options to determine which files should be bumped
				grunt.config.set('bump.options.commitMessage', name);
				grunt.config.set('bump.options.tagMessage',  name);
				grunt.file.delete('./etc/branch_description.json');
				break;
			case 'note':
				branch = grunt.file.readJSON('./etc/branch_description.json');;
				grunt.config.set('branchInfo', branch);
				grunt.config.set('gitmerge.noted.options.branch', makeBranchName(branch.type, branch.title));
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

		// pull
		//
		// check out dev
		//
		// pull
		//
		// if not on submit branch
		//  - check out new review branch based on original branch's name
		//  - merge branch user was on into new branch
		//  - if no errors, push to origin
		//
		// if on submit branch
		//  - pull
		//  - commit with message "correcting conflicts" if there is anything to commit
		//  - if no errors, push to origin
		//
		// if errors, tell user to correct conflicts and submit again

	//grunt.registerTask('card:review', 'review a branch for submission', function() {
		// user selects branch to review from list of available branches
		//
		// checkout selected branch
		//
		// pull
		//
		// checkout dev 
		//
		// pull
		//
		// create new review branch 
		//
		// merge selected branch 
		//
		// if no errors, tell user to have at it
		//  
		// if errors, tell user to either correct conflicts or reject
	//});

	grunt.registerTask('card:log', 'see history of approved cards', function(){
		// show changelog of approved cards
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
