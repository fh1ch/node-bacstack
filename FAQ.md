# Frequently Asked Questions

This file contains a collection of frequently asked questions and additional
background information.

## Why can't I connect to my local device simulator?

BACnet uses unicast and broadcast UDP telegrams on a single port to communicate
with other devices. This makes it impossible to run two BACnet stacks on the
same machine without taking a detour. The most promising way is either to rely
on something like Docker an use it's internal network (e.g. see
`docker-compose.yml`) or use a secondary IP for your local machine.

## I receive the error `ERR_TIMEOUT`. What does this mean?

The error type `ERR_TIMEOUT` is created by Node BACstack itself, if no answer
has been received from a target device in the defined timeout window. This can
have a variety of root-causes like issues on the remote device itself (e.g.
communication disabled), network issues (e.g. wrong network topology), wrong
communication parameters (e.g. wrong port) or ignored limitations (stack doesn't
support routing). Some tips regarding debugging such issues are described in
this document.

## I receive the error `BacnetError - Class: X - Code: Y`. What does this mean?

The two error types `BacnetError` and `BacnetAbort` are application level errors
and are returned by a BACnet remote device in case of a failure. Both error
types also contain the reason for the failure, which can be interpreted like:

```txt
Error: BacnetError - Class: [X] - Code: [Y]
[X] => In `lib/enum.js` see `ErrorClass`.
[Y] => In `lib/enum.js` see `ErrorCode`.

Error: BacnetAbort - Reason: [Z]
[Z] => In `lib/enum.js` see `RejectReason`.
```

We therefore can encode the example `Error: BacnetError - Class: 2 - Code: 32`
to `Error: BacnetError - Class: PROPERTY - Code: UNKNOWN_PROPERTY`,  meaning the
property we tried to read or modify doesn't exist.

## What is the easiest way to debug failing operations?

A good way to start debugging all sort of failures, is to cross-check the
attempted function with another BACnet tool, such as one of the many freely
available BACnet browsers. This verifies, if the attempted function itself works
with the target device and rules-out other issues like connectivity.

This stack also has internal debug messages, which can be enabled with
`export DEBUG=bacstack`. It will print all sorts of internals to the console,
which can be used to get an idea, if or why messages are getting dropped.

Another powerful tool to not only identify network issues, but also verify sent
and received messages is [Wireshark](https://wireshark.org/). It comes with
inbuilt BACnet analysis tooling, which can help to make all BACnet telegrams
visible and also checks if they comply to the BACnet standard.

## Where can I get more information / examples on undocumented functions?

Beneath the rendered documentation itself, a good starting point for even more
examples are the compliance tests. They use the stack via it's public interface
and test a wide variety of scenarios. The tests are splitted into individual
files per function and can be found in `test/compliance/`.
