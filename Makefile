CURRENT_GIT_BRANCH := $(shell echo $$(git rev-parse --abbrev-ref HEAD))

push:
ifeq ($(branch),)
	echo "make command must have \"branch\" parameter - make push branch=master"
	exit 1
endif
	git add .
ifeq ($(message),)
	git commit -a --allow-empty
else
	git commit -am "$(message)" --allow-empty
endif
	git pull origin $(CURRENT_GIT_BRANCH)
ifneq ($(CURRENT_GIT_BRANCH),$(branch))
ifeq ($(shell git show-ref refs/heads/$(branch) | wc -l | sed -e 's/^[[:space:]]*//'),0)
	git checkout -b $(branch)
else
ifeq ($(shell git show-ref refs/heads/$(branch) | wc -l | sed -e 's/^[[:space:]]*//'),1)
	git checkout $(branch)
endif
endif
endif
ifneq ($(shell git ls-remote --exit-code origin $(branch) | wc -l | sed -e 's/^[[:space:]]*//'),0)
	git pull origin $(branch)
endif
ifneq ($(CURRENT_GIT_BRANCH),$(branch))
	git merge $(CURRENT_GIT_BRANCH)
endif
	git push origin $(branch)
ifneq ($(CURRENT_GIT_BRANCH),$(branch))
	git checkout $(CURRENT_GIT_BRANCH)
endif