// import omit from 'lodash/fp/omit'
// import { Mutator } from '../../types/base'

// /**
//  * Start a running test, using a range to optionally control start
//  * and end index
//  */
// export type Shape = (
//   testID: string,
//   playRange?: [number, number],
//   forceNewPlayback?: boolean
// ) => Promise<void>

// export const mutator: Mutator<Shape> = (
//   session,
//   { params: [testID, playRange = [0, -1]] }
// ) => ({
//   ...session,
//   state: {
//     ...session.state,
//     playback: {
//       ...session.state.playback,
//       commands:
//         playRange[0] === 0
//           ? omit(
//               session.project.tests
//                 .find((t) => t.id === testID)
//                 ?.commands.map((cmd) => cmd.id)
//                 .slice(
//                   playRange[0],
//                   playRange[1] === -1 ? undefined : playRange[1]
//                 ) ?? [],
//               session.state.playback.commands
//             )
//           : session.state.playback.commands,
//     },
//     status: 'playing',
//     stopIndex: playRange[1],
//   },
// })

import omit from 'lodash/fp/omit'
import { Mutator } from '../../types/base'
import { CommandShape } from '@seleniumhq/side-model'


/**
 * Start a running test, using a range to optionally control start
 * and end index
 */
export type Shape = (
  testID: string,
  playRange?: [number, number],
  forceNewPlayback?: boolean
) => Promise<void>

export const mutator: Mutator<Shape> =  (
  session,
  { params: [testID, playRange = [0, -1]] }
) => {
  // console.log('Mutator called with testID:', testID);
  // console.log('Playback range:', playRange);

  const test = session.project.tests.find((t) => t.id === testID);
  if (!test) {
    // console.log('Test not found!');
    return session;
  }

  const reorderTargets =  (targets: [string, string][], executionPriority: string) => {
    // console.log('Reordering targets with execution priority:', executionPriority);

    const xpathTargets: [string, string][] = []
    const cssTargets: [string, string][] = []
    const otherTargets: [string, string][] = []

    targets.forEach(([value, type]) => {
      if (type.startsWith('xpath')) {
        if (type === 'xpath:position') {
          xpathTargets.unshift([value, type])
        } else {
          xpathTargets.push([value, type])
        }
      } else if (type.startsWith('css')) {
        cssTargets.push([value, type])
      } else {
        otherTargets.push([value, type])
      }
    })
    if (executionPriority === 'absolute') {
      // If executionPriority is 'default', prioritize CSS over XPath
      return [...xpathTargets, ...otherTargets, ...cssTargets];
    } else 
    // if(executionPriority === 'default')
      {
      // If executionPriority is 'absolute', prioritize XPath over CSS
      return [...cssTargets,...xpathTargets, ...otherTargets ];
    }
    //  else{
    //   return targets
    // }

    // const orderedTargets = executionPriority === 'absolute'
    //   ? [...xpathTargets, ...otherTargets, ...cssTargets]
    //   : [...cssTargets, ...xpathTargets, ...otherTargets]

    // // console.log('Ordered targets:', orderedTargets);
    // return orderedTargets
  }
  const project =session.project
  const fetchData =  () => {
    // console.log('Fetching data for activeTestID:', testID,test);

    try {
      if (testID !== '-1') {

          const executionPriority = test.locatorstrategy || 'reset';
          let commands = [];
          const indexVal = session.project.tests.findIndex(item => item.id === testID);
          // console.log('Test index:', indexVal);
          for (let i = 0; i < test.commands.length; i++) {
            let command: CommandShape = test.commands[i];

            if (command.targets) {
              command.targets =  reorderTargets(command.targets, executionPriority);
            }
            if(executionPriority !== 'reset'){
              command.target = command.targets?.[0]?.[0] ||test.commands[i].target;
            }
          
            commands.push(command);
          }
         
          // updatedTests[indexVal].commands = commands;
          // updatedTests[indexVal].locatorstrategy = executionPriority;
         
          // console.log('Updated test commands:', project);
          project.tests[indexVal].commands = commands
          project.tests[indexVal].locatorstrategy = executionPriority
  
          // Call the `update` mutator to update the session with the new test data
        //   update(session, {
        //   params: [updatedTests],
        // });
          // Simulate the update action
          // session.project.tests = updatedTests;
        }
      }
    catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Call fetchData before updating session state
   fetchData();

  // const commandsToOmit = test.commands
  //   .map((cmd) => cmd.id)
  //   .slice(playRange[0], playRange[1] === -1 ? undefined : playRange[1]);

  // console.log('Commands to omit:', commandsToOmit);

  // const updatedPlaybackCommands = playRange[0] === 0
  //   ? omit(commandsToOmit, session.state.playback.commands)
  //   : session.state.playback.commands;

  return {
    ...session,
   state: {
    ...session.state,
    playback: {
      ...session.state.playback,
      commands:
        playRange[0] === 0
          ? omit(
              session.project.tests
                .find((t) => t.id === testID)
                ?.commands.map((cmd) => cmd.id)
                .slice(
                  playRange[0],
                  playRange[1] === -1 ? undefined : playRange[1]
                ) ?? [],
              session.state.playback.commands
            )
          : session.state.playback.commands,
    },
    status: 'playing',
    stopIndex: playRange[1],
  },
   project: project
  };
};

