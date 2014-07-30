# grunt-card

> kanban in your terminal

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-card --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-card');
```

## 'grunt card'
Start a new card

You will be asked what you are working on and what sort of issue it is. The answers you give will be used to title the resulting branch, and the branches that will follow in the steps to come

## 'grunt card:submit'

Once you have completed your task and committed the changes, running card:submit will take the steps necessary to generate a review branch

## 'grunt card:review'

Get a list of cards available to review

## 'grunt card:approve'

Merge the current branch into the dev branch and make a tag for it

## 'grunt card:log'

Filterable list of the releases

    e.g. grunt card:log:0.1
