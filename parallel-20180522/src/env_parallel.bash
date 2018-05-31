#!/usr/bin/env bash

# This file must be sourced in bash:
#
#   source `which env_parallel.bash`
#
# after which 'env_parallel' works
#
#
# Copyright (C) 2016,2017,2018
# Ole Tange and Free Software Foundation, Inc.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, see <http://www.gnu.org/licenses/>
# or write to the Free Software Foundation, Inc., 51 Franklin St,
# Fifth Floor, Boston, MA 02110-1301 USA

env_parallel() {
    # env_parallel.bash

    _names_of_ALIASES() {
	compgen -a
    }
    _bodies_of_ALIASES() {
	local _i
	for _i in $@; do
	    if [ $(alias $_i | wc -l) == 1 ] ; then
		true Alias is a single line. Good.
	    else
		_warning "Alias '$_i' contains newline."
		_warning "Make sure the command has at least one newline after '$_i'."
		_warning "See BUGS in 'man env_parallel'."
	    fi
	done
	alias "$@"
    }
    _names_of_FUNCTIONS() {
	compgen -A function
    }
    _bodies_of_FUNCTIONS() {
	typeset -f "$@"
    }
    _names_of_VARIABLES() {
	compgen -A variable
    }
    _bodies_of_VARIABLES() {
	typeset -p "$@"
    }
    _remove_bad_NAMES() {
	# Do not transfer vars and funcs from env_parallel
	_remove_readonly() {
	   _list_readonly() {
	       readonly | perl -pe 's/^\S+\s+\S+\s+(\S[^=]*)=.*/$1/'
	   }
	   perl -e '$r=join("|",@ARGV); while(<STDIN>) {/$r/o or print}' `_list_readonly`
	}
	# Macos-grep does not like long patterns
	# Old Solaris grep does not support -E
	# so 'grep' is converted to 'perl'

	# Perl Version of:
	#   grep -Ev '^(_names_of_ALIASES|_bodies_of_ALIASES|_names_of_maybe_FUNCTIONS|_names_of_FUNCTIONS|_bodies_of_FUNCTIONS|_names_of_VARIABLES|_bodies_of_VARIABLES|_remove_bad_NAMES|_prefix_PARALLEL_ENV)$' |
	#   grep -Ev '^(_get_ignored_VARS|_make_grep_REGEXP|_ignore_UNDERSCORE|_alias_NAMES|_list_alias_BODIES|_function_NAMES|_list_function_BODIES|_variable_NAMES|_list_variable_VALUES|_prefix_PARALLEL_ENV|PARALLEL_TMP)$' |
	perl -ne '/^(_names_of_ALIASES|
			   _bodies_of_ALIASES|
			   _names_of_maybe_FUNCTIONS|
			   _names_of_FUNCTIONS|
			   _bodies_of_FUNCTIONS|
			   _names_of_VARIABLES|
			   _bodies_of_VARIABLES|
			   _remove_bad_NAMES|
			   _remove_readonly|
			   _prefix_PARALLEL_ENV|
			   _get_ignored_VARS|
			   _make_grep_REGEXP|
			   _ignore_UNDERSCORE|
			   _alias_NAMES|
			   _list_alias_BODIES|
			   _function_NAMES|
			   _list_function_BODIES|
			   _variable_NAMES|
			   _list_variable_VALUES|
			   _prefix_PARALLEL_ENV|
			   PARALLEL_TMP)$/x or print' |
	    # Filter names matching --env
	    # perl version of: grep -E "^$_grep_REGEXP"\$ | grep -vE "^"\$ |
	    perl -ne "/^$_grep_REGEXP"'$/ and not /^'"$_ignore_UNDERSCORE"'$/ and print' |
            _remove_readonly |
	    # perl version of: grep -Ev '^(BASHOPTS|BASHPID|EUID|GROUPS|FUNCNAME|DIRSTACK|_|PIPESTATUS|PPID|SHELLOPTS|UID|USERNAME|BASH_[A-Z_]+)$'
	    perl -ne 'not /^(BASHOPTS|BASHPID|EUID|GROUPS|FUNCNAME|DIRSTACK|_|PIPESTATUS|PPID|SHELLOPTS|UID|USERNAME|BASH_[A-Z_]+)$/ and print'
    }
    _prefix_PARALLEL_ENV() {
        shopt 2>/dev/null |
        perl -pe 's:\s+off:;: and s/^/shopt -u /;
                  s:\s+on:;: and s/^/shopt -s /;
                  s:;$:&>/dev/null;:';
        echo 'shopt -s expand_aliases &>/dev/null';
    }

    _get_ignored_VARS() {
        perl -e '
            for(@ARGV){
                $next_is_env and push @envvar, split/,/, $_;
                $next_is_env=/^--env$/;
            }
            if(grep { /^_$/ } @envvar) {
                if(not open(IN, "<", "$ENV{HOME}/.parallel/ignored_vars")) {
             	    print STDERR "parallel: Error: ",
            	    "Run \"parallel --record-env\" in a clean environment first.\n";
                } else {
            	    chomp(@ignored_vars = <IN>);
                }
            }
            if($ENV{PARALLEL_IGNORED_NAMES}) {
                push @ignored_vars, split/\s+/, $ENV{PARALLEL_IGNORED_NAMES};
                chomp @ignored_vars;
            }
            $vars = join "|",map { quotemeta $_ } "env_parallel", @ignored_vars;
	    print $vars ? "($vars)" : "(,,nO,,VaRs,,)";
            ' -- "$@"
    }

    # Get the --env variables if set
    # --env _ should be ignored
    # and convert  a b c  to (a|b|c)
    # If --env not set: Match everything (.*)
    _make_grep_REGEXP() {
        perl -e '
            for(@ARGV){
                /^_$/ and $next_is_env = 0;
                $next_is_env and push @envvar, split/,/, $_;
                $next_is_env = /^--env$/;
            }
            $vars = join "|",map { quotemeta $_ } @envvar;
            print $vars ? "($vars)" : "(.*)";
            ' -- "$@"
    }
    _which() {
	# type returns:
	#   ll is an alias for ls -l (in ash)
	#   bash is a tracked alias for /bin/bash
	#   true is a shell builtin
	#   myfunc is a function (in bash)
	#   myfunc is a shell function (in zsh)
	#   which is /usr/bin/which
	#   which is hashed (/usr/bin/which)
	#   aliased to `alias | /usr/bin/which --tty-only --read-alias --show-dot --show-tilde'
	# Return 0 if found, 1 otherwise
	LANG=C type "$@" |
	    perl -pe '$exit += (s/ is an alias for .*// ||
	                        s/ is aliased to .*// ||
                                s/ is a function// ||
                                s/ is a shell function// ||
                                s/ is a shell builtin// ||
                                s/.* is hashed .(\S+).$/$1/ ||
                                s/.* is (a tracked alias for )?//);
                      END { exit not $exit }'
    }
    _warning() {
	echo "env_parallel: Warning: $@" >&2
    }
    _error() {
	echo "env_parallel: Error: $@" >&2
    }

    # Bash is broken in version 3.2.25 and 4.2.39
    # The crazy '[ "`...`" == "" ]' is needed for the same reason
    if [ "`_which parallel`" == "" ]; then
	_error 'parallel must be in $PATH.'
	return 255
    fi

    # Grep regexp for vars given by --env
    _grep_REGEXP="`_make_grep_REGEXP \"$@\"`"

    # Deal with --env _
    _ignore_UNDERSCORE="`_get_ignored_VARS \"$@\"`"

    # --record-env
    # Bash is broken in version 3.2.25 and 4.2.39
    # The crazy '[ "`...`" == 0 ]' is needed for the same reason
    if [ "`perl -e 'exit grep { /^--record-env$/ } @ARGV' -- "$@"; echo $?`" == 0 ] ; then
	true skip
    else
	(_names_of_ALIASES;
	 _names_of_FUNCTIONS;
	 _names_of_VARIABLES) |
	    cat > $HOME/.parallel/ignored_vars
	return 0
    fi

    # --session
    # Bash is broken in version 3.2.25 and 4.2.39
    # The crazy '[ "`...`" == 0 ]' is needed for the same reason
    if [ "`perl -e 'exit grep { /^--session$/ } @ARGV' -- "$@"; echo $?`" == 0 ] ; then
	true skip
    else
	PARALLEL_IGNORED_NAMES="`_names_of_ALIASES;
	 _names_of_FUNCTIONS;
	 _names_of_VARIABLES`"
	export PARALLEL_IGNORED_NAMES
	return 0
    fi

    # Grep alias names
    _alias_NAMES="`_names_of_ALIASES | _remove_bad_NAMES | xargs echo`"
    _list_alias_BODIES="_bodies_of_ALIASES $_alias_NAMES"
    if [ "$_alias_NAMES" = "" ] ; then
	# no aliases selected
	_list_alias_BODIES="true"
    fi
    unset _alias_NAMES

    # Grep function names
    _function_NAMES="`_names_of_FUNCTIONS | _remove_bad_NAMES | xargs echo`"
    _list_function_BODIES="_bodies_of_FUNCTIONS $_function_NAMES"
    if [ "$_function_NAMES" = "" ] ; then
	# no functions selected
	_list_function_BODIES="true"
    fi
    unset _function_NAMES

    # Grep variable names
    _variable_NAMES="`_names_of_VARIABLES | _remove_bad_NAMES | xargs echo`"
    _list_variable_VALUES="_bodies_of_VARIABLES $_variable_NAMES"
    if [ "$_variable_NAMES" = "" ] ; then
	# no variables selected
	_list_variable_VALUES="true"
    fi
    unset _variable_NAMES

    _which_true="`_which true`"
    # Copy shopt (so e.g. extended globbing works)
    # But force expand_aliases as aliases otherwise do not work
    PARALLEL_ENV="`
        _prefix_PARALLEL_ENV
        $_list_alias_BODIES;
        $_list_function_BODIES;
        $_list_variable_VALUES;
    `"
    export PARALLEL_ENV
    unset _list_alias_BODIES
    unset _list_variable_VALUES
    unset _list_function_BODIES
    unset _grep_REGEXP
    unset _ignore_UNDERSCORE
    # Test if environment is too big
    if [ "`_which true`" == "$_which_true" ] ; then
	parallel "$@";
	_parallel_exit_CODE=$?
	unset PARALLEL_ENV;
	return $_parallel_exit_CODE
    else
	unset PARALLEL_ENV;
	_error "Your environment is too big."
	_error "You can try 2 different approaches:"
	_error "1. Use --env and only mention the names to copy."
	_error "2. Try running this in a clean environment once:"
	_error "     env_parallel --record-env"
	_error "   And then use '--env _'"
	_error "For details see: man env_parallel"
	return 255
    fi
}

parset() {
    _parset_parallel_prg=parallel
    _parset_main "$@"
}

env_parset() {
    _parset_parallel_prg=env_parallel
    _parset_main "$@"
}

_parset_main() {
    # If $1 contains ',' or space:
    #   Split on , to get the destination variable names
    # If $1 is a single destination variable name:
    #   Treat it as the name of an array
    #
    #   # Create array named myvar
    #   parset myvar echo ::: {1..10}
    #   echo ${myvar[5]}
    #
    #   # Put output into $var_a $var_b $var_c
    #   varnames=(var_a var_b var_c)
    #   parset "${varnames[*]}" echo ::: {1..3}
    #   echo $var_c
    #
    #   # Put output into $var_a4 $var_b4 $var_c4
    #   parset "var_a4 var_b4 var_c4" echo ::: {1..3}
    #   echo $var_c4

    _parset_name="$1"
    if [ "$_parset_name" = "" ] ; then
	echo parset: Error: No destination variable given. >&2
	echo parset: Error: Try: >&2
	echo parset: Error: ' ' parset myarray echo ::: foo bar >&2
	return 255
    fi
    shift
    echo "$_parset_name" |
	perl -ne 'chomp;for (split /[, ]/) {
            # Allow: var_32 var[3]
	    if(not /^[a-zA-Z_][a-zA-Z_0-9]*(\[\d+\])?$/) {
                print STDERR "parset: Error: $_ is an invalid variable name.\n";
                print STDERR "parset: Error: Variable names must be letter followed by letters or digits.\n";
                $exitval = 255;
            }
        }
        exit $exitval;
        ' || return 255
    if perl -e 'exit not grep /,| /, @ARGV' "$_parset_name" ; then
	# $_parset_name contains , or space
	# Split on , or space to get the names
	eval "$(
	    # Compute results into files
	    $_parset_parallel_prg --files -k "$@" |
		# var1=`cat tmpfile1; rm tmpfile1`
		# var2=`cat tmpfile2; rm tmpfile2`
		parallel -q echo {2}='`cat {1}; rm {1}`' :::: - :::+ $(
		    echo "$_parset_name" |
			perl -pe 's/,/ /g'
			 )
	    )"
    else
	# $_parset_name does not contain , or space
	# => $_parset_name is the name of the array to put data into
	# Supported in: bash zsh ksh
	# Arrays do not work in: ash dash
	eval "$_parset_name=( $( $_parset_parallel_prg --files -k "$@" |
              perl -pe 'chop;$_="\"\`cat $_; rm $_\`\" "' ) )"
    fi
}
