/*
 * grunt-card
 * https://github.com/sdicgdev/grunt-card
 *
 * Copyright (c) 2014 Evan Short
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
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
			}
		},
		gitcommit: {
			release: {
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
		prompt: {
			startCard: {
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
	});

	grunt.registerTask('card', 'start a new card',[
			'prompt:startCard',	// ask what the user is working on
			'gitcheckout:dev', // check out dev
			'gitpull:dev', // pull dev
			'startCard' // perform git operations to begin a new card
	]);

	grunt.registerTask('startCard', 'perform git operations to begin a new card', function(){
		// start and check out a new branch whose name is based on user's answer
		var branchTitle = grunt.config('cardDescription'),
		    branchType  = grunt.config('cardType');

		branchTitle = branchType+"_"+camelCaseSentence(branchTitle);
		grunt.config.set('gitcheckout.branch.options.branch', branchTitle)
		grunt.task.run('gitcheckout:branch');
		grunt.log.writeln(branchTitle);
	});

	grunt.registerTask('card:submit', 'submit what you are working on for review', function() {
		// note the current branch
		//
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
	});

	grunt.registerTask('card:review', 'review a branch for submission', function() {
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
	});

	grunt.registerTask('card:reject', 'send a branch back for more work', function() {
		// move review branch to holding branch for corrections
		//
		// delete review branch
	});

	grunt.registerTask('card:approve', 'send a branch back for more work', function() {
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
	});

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
